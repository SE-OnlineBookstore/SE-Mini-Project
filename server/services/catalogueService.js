// Catalogue & Search Service (FR-07 to FR-10, FR-12; NFR-01).
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Listing = require('../models/Listing');
const Category = require('../models/Category');
const cache = require('../adapters/cache');
const { isValidIsbn13, normaliseIsbn } = require('../utils/isbn');
const { E } = require('../utils/AppError');

const SEARCH_TTL_SEC = 300; // five-minute cache for repeated filter combinations (NFR-01)
const { ObjectId } = mongoose.Types;

const SORTS = {
  price_asc: { lowest_price: 1, _id: 1 },
  price_desc: { lowest_price: -1, _id: 1 },
  rating: { avg_rating: -1, review_count: -1, _id: 1 },
  newest: { last_listed_at: -1, _id: 1 },
};

const CARD_PROJECTION = { title: 1, author: 1, isbn13: 1, cover_url: 1, lowest_price: 1, avg_rating: 1, review_count: 1 };
const toCard = (b) => ({
  id: String(b._id), title: b.title, author: b.author, isbn13: b.isbn13, coverUrl: b.cover_url || null,
  lowestPrice: b.lowest_price, avgRating: Math.round((b.avg_rating || 0) * 10) / 10, reviewCount: b.review_count,
});

async function resolveCategoryId(category) {
  if (!category) return null;
  const cat = /^[a-f0-9]{24}$/i.test(category)
    ? await Category.findById(category).lean()
    : await Category.findOne({ slug: String(category).toLowerCase() }).lean();
  return cat ? cat._id : undefined; // undefined = unknown category, yields no results
}

function buildPipeline(params, categoryId) {
  const { q, language, minRating, condition, minPrice, maxPrice, sort, page, limit } = params;
  const match = { active_offers: { $gt: 0 } };
  if (q) match.$text = { $search: q };
  if (categoryId) match.category_id = categoryId;
  if (language) match.language = language;
  if (minRating) match.avg_rating = { $gte: minRating };

  const pipeline = [{ $match: match }];
  if (q) pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });

  // Offer-level filters need the listings; the lowest price is then the lowest matching offer.
  if (condition || minPrice != null || maxPrice != null) {
    const offerMatch = [{ $eq: ['$book_id', '$$bookId'] }, { $eq: ['$status', 'ACTIVE'] }];
    if (condition) offerMatch.push({ $eq: ['$condition', condition] });
    if (minPrice != null) offerMatch.push({ $gte: ['$price', minPrice] });
    if (maxPrice != null) offerMatch.push({ $lte: ['$price', maxPrice] });
    pipeline.push(
      { $lookup: { from: 'listings', let: { bookId: '$_id' }, pipeline: [{ $match: { $expr: { $and: offerMatch } } }, { $project: { price: 1 } }], as: 'offers' } },
      { $match: { 'offers.0': { $exists: true } } },
      { $addFields: { lowest_price: { $min: '$offers.price' } } },
    );
  }

  const sortStage = sort ? SORTS[sort] : q ? { score: -1, _id: 1 } : SORTS.newest;
  return {
    items: [...pipeline, { $sort: sortStage }, { $skip: (page - 1) * limit }, { $limit: limit }, { $project: CARD_PROJECTION }],
    count: [...pipeline, { $count: 'n' }],
  };
}

// Concurrent identical cache misses share one database query (NFR-01).
const inflight = new Map();

async function runSearch(params) {
  const categoryId = await resolveCategoryId(params.category);
  let result;
  if (categoryId === undefined) {
    result = { items: [], page: params.page, limit: params.limit, total: 0 };
  } else {
    const { items: itemsPipeline, count: countPipeline } = buildPipeline(params, categoryId);
    // The total does not depend on page, limit or sort, so it is cached once per filter combination.
    const countKey = `search:count:${JSON.stringify({ ...params, page: undefined, limit: undefined, sort: undefined })}`;
    const cachedTotal = await cache.get(countKey);
    const totalPromise = cachedTotal !== null
      ? Promise.resolve(cachedTotal)
      : Book.aggregate(countPipeline).then(async (count) => {
        const n = count.length ? count[0].n : 0;
        await cache.set(countKey, n, SEARCH_TTL_SEC);
        return n;
      });
    const [items, total] = await Promise.all([Book.aggregate(itemsPipeline), totalPromise]);
    result = { items: items.map(toCard), page: params.page, limit: params.limit, total };
  }

  // FR-08: when nothing matches, say so plainly and offer the nearest category.
  if (result.total === 0 && params.q) {
    const words = params.q.split(/\s+/).filter((w) => w.length > 2).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const near = words.length ? await Category.findOne({ name: { $regex: words.join('|'), $options: 'i' } }).lean() : null;
    const fallback = near || (await Category.findOne({ parent_id: null }).sort({ name: 1 }).lean());
    result.suggestion = fallback ? { category: { id: String(fallback._id), name: fallback.name, slug: fallback.slug } } : null;
  }
  return result;
}

async function search(params) {
  const key = `search:${JSON.stringify(params)}`;
  const cached = await cache.get(key);
  if (cached) return { ...cached, cached: true };
  if (inflight.has(key)) return inflight.get(key);

  const pending = runSearch(params)
    .then(async (result) => {
      await cache.set(key, result, SEARCH_TTL_SEC);
      return result;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}

async function getBook(id) {
  if (!ObjectId.isValid(id)) throw E.notFound('BOOK_NOT_FOUND', 'Book not found.');
  const book = await Book.findById(id).populate('category_id', 'name slug').lean();
  if (!book) throw E.notFound('BOOK_NOT_FOUND', 'Book not found.');
  const offers = await Listing.find({ book_id: id, status: 'ACTIVE' })
    .sort({ price: 1 })
    .populate('seller_id', 'name')
    .lean();
  return {
    book: {
      id: String(book._id), isbn13: book.isbn13, title: book.title, author: book.author, publisher: book.publisher,
      language: book.language, mrp: book.mrp, coverUrl: book.cover_url, description: book.description,
      category: book.category_id ? { id: String(book.category_id._id), name: book.category_id.name, slug: book.category_id.slug } : null,
      avgRating: Math.round(book.avg_rating * 10) / 10, reviewCount: book.review_count,
    },
    offers: offers.map((o) => ({
      listingId: String(o._id), condition: o.condition, price: o.price,
      seller: { id: String(o.seller_id._id), name: o.seller_id.name },
      inStock: o.stock_qty > 0, stockQty: o.stock_qty,
    })),
  };
}

async function findByIsbn(raw) {
  const isbn = normaliseIsbn(raw);
  if (!isValidIsbn13(isbn)) throw E.badRequest('ISBN_INVALID', 'That is not a valid ISBN-13.');
  const book = await Book.findOne({ isbn13: isbn }).lean();
  if (!book) throw E.notFound('BOOK_NOT_FOUND', 'No catalogue entry for this ISBN. Enter the details manually.');
  return { book: { id: String(book._id), isbn13: book.isbn13, title: book.title, author: book.author, publisher: book.publisher, language: book.language, mrp: book.mrp, categoryId: String(book.category_id) } };
}

// FR-12: up to six titles, same author first, then same category; never the title itself and
// never a title without an active listing.
async function related(id) {
  if (!ObjectId.isValid(id)) throw E.notFound('BOOK_NOT_FOUND', 'Book not found.');
  const book = await Book.findById(id).lean();
  if (!book) throw E.notFound('BOOK_NOT_FOUND', 'Book not found.');
  const base = { _id: { $ne: book._id }, active_offers: { $gt: 0 } };
  const byAuthor = await Book.find({ ...base, author: book.author }).sort({ avg_rating: -1 }).limit(6).lean();
  const seen = byAuthor.map((b) => b._id);
  const byCategory = byAuthor.length < 6
    ? await Book.find({ ...base, _id: { $nin: [book._id, ...seen] }, category_id: book.category_id }).sort({ avg_rating: -1 }).limit(6 - byAuthor.length).lean()
    : [];
  return {
    items: [...byAuthor, ...byCategory].map((b) => ({ id: String(b._id), title: b.title, author: b.author, coverUrl: b.cover_url || null, lowestPrice: b.lowest_price, avgRating: b.avg_rating })),
  };
}

async function categories() {
  const items = await Category.find().sort({ name: 1 }).lean();
  return { items: items.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, parentId: c.parent_id ? String(c.parent_id) : null })) };
}

// Recomputes the denormalised offer fields on BOOK. Called whenever a listing changes.
async function refreshBookStats(bookId) {
  const filter = { book_id: bookId, status: 'ACTIVE' };
  const [cheapest, count, latest] = await Promise.all([
    Listing.findOne(filter).sort({ price: 1 }).select('price').lean(), // served by the (book_id, status, price) index
    Listing.countDocuments(filter),
    Listing.findOne(filter).sort({ created_at: -1 }).select('created_at').lean(),
  ]);
  await Book.updateOne(
    { _id: bookId },
    { $set: { lowest_price: cheapest ? cheapest.price : null, active_offers: count, ...(latest ? { last_listed_at: latest.created_at } : {}) } },
  );
  await cache.delByPrefix('search:');
}

module.exports = { search, getBook, findByIsbn, related, categories, refreshBookStats, buildPipeline, SEARCH_TTL_SEC };
