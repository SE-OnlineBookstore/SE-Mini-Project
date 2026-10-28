// FR-11: verified-purchase reviews. A buyer may review a book only through an order line of that
// title whose item status is DELIVERED, and at most once per order line (BR-01).
const mongoose = require('mongoose');
const { Book, Listing, Order, OrderItem, Review } = require('../models');
const cache = require('../adapters/cache');
const { E } = require('../utils/AppError');

// Recalculates the title's average rating (one decimal) from reviews that are not blocked.
async function recalculateRating(bookId) {
  const [agg] = await Review.aggregate([
    { $match: { book_id: new mongoose.Types.ObjectId(bookId), is_blocked: false } },
    { $group: { _id: '$book_id', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const stats = { avg_rating: agg ? Math.round(agg.avg * 10) / 10 : 0, review_count: agg ? agg.count : 0 };
  await Book.updateOne({ _id: bookId }, { $set: stats });
  await cache.delByPrefix('search:'); // catalogue pages show the average rating
  return stats;
}

async function create(bookId, buyerId, { rating, comment }) {
  const book = await Book.findById(bookId).select('_id').lean();
  if (!book) throw E.notFound('BOOK_NOT_FOUND', 'The requested book was not found.');

  const listingIds = await Listing.distinct('_id', { book_id: bookId });
  const orderIds = await Order.distinct('_id', { buyer_id: buyerId });
  const lines = await OrderItem.find({
    order_id: { $in: orderIds },
    listing_id: { $in: listingIds },
    item_status: 'DELIVERED',
  }).select('_id').lean();
  if (!lines.length) {
    throw E.forbidden('REVIEW_NOT_ELIGIBLE', 'You can review a book only after it has been delivered to you.');
  }

  const reviewed = await Review.find({ order_item_id: { $in: lines.map((l) => l._id) } }).select('order_item_id').lean();
  const reviewedIds = new Set(reviewed.map((r) => String(r.order_item_id)));
  const free = lines.find((l) => !reviewedIds.has(String(l._id)));
  if (!free) throw E.conflict('REVIEW_ALREADY_EXISTS', 'You have already reviewed this order line.');

  let review;
  try {
    review = await Review.create({ book_id: bookId, buyer_id: buyerId, order_item_id: free._id, rating, comment });
  } catch (err) {
    // Two requests racing for the same order line: the unique index on order_item_id decides.
    if (err.code === 11000) throw E.conflict('REVIEW_ALREADY_EXISTS', 'You have already reviewed this order line.');
    throw err;
  }
  const stats = await recalculateRating(bookId);
  return {
    id: String(review._id),
    bookId: String(bookId),
    rating: review.rating,
    comment: review.comment || '',
    createdAt: review.created_at,
    avgRating: stats.avg_rating,
    reviewCount: stats.review_count,
  };
}

module.exports = { create, recalculateRating };
