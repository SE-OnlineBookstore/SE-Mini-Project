// Wishlist business logic (FR-14). Single-action move-to-cart.
const Wishlist = require('../models/Wishlist');
const Listing = require('../models/Listing');
const cartService = require('./cartService');
const { E } = require('../utils/AppError');

async function getWishlist(buyerId) {
  const items = await Wishlist.find({ buyer_id: buyerId })
    .populate({
      path: 'listing_id',
      populate: { path: 'book_id', select: 'title author coverUrl isbn13 mrp' },
    })
    .sort({ added_at: -1 });

  const formattedItems = [];
  for (const item of items) {
    const listing = item.listing_id;
    if (!listing) continue;

    const book = listing.book_id;
    formattedItems.push({
      id: String(item._id),
      listingId: String(listing._id),
      addedAt: item.added_at,
      price: listing.price,
      condition: listing.condition,
      inStock: listing.stock_qty > 0 && listing.status === 'ACTIVE',
      availableStock: listing.stock_qty,
      book: book
        ? {
            id: String(book._id),
            title: book.title,
            author: book.author,
            coverUrl: book.coverUrl,
            isbn13: book.isbn13,
            mrp: book.mrp,
          }
        : null,
    });
  }

  return { items: formattedItems, count: formattedItems.length };
}

async function addItem(buyerId, { listingId }) {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw E.notFound('LISTING_NOT_FOUND', 'Listing not found.');
  }

  if (String(listing.seller_id) === String(buyerId)) {
    throw E.badRequest('CANNOT_BUY_OWN_LISTING', 'Sellers cannot add their own listings to wishlist.');
  }

  let item = await Wishlist.findOne({ buyer_id: buyerId, listing_id: listingId });
  if (item) {
    return { item: { id: String(item._id), listingId: String(listingId) }, alreadyInWishlist: true };
  }

  item = await Wishlist.create({ buyer_id: buyerId, listing_id: listingId });
  return { item: { id: String(item._id), listingId: String(listingId) }, alreadyInWishlist: false };
}

async function removeItem(buyerId, itemId) {
  const item = await Wishlist.findOne({
    buyer_id: buyerId,
    $or: [{ _id: itemId.match(/^[0-9a-fA-F]{24}$/) ? itemId : null }, { listing_id: itemId.match(/^[0-9a-fA-F]{24}$/) ? itemId : null }],
  });

  if (!item) {
    throw E.notFound('WISHLIST_ITEM_NOT_FOUND', 'Item not found in wishlist.');
  }

  await item.deleteOne();
}

async function moveToCart(buyerId, itemId) {
  const item = await Wishlist.findOne({
    buyer_id: buyerId,
    $or: [{ _id: itemId.match(/^[0-9a-fA-F]{24}$/) ? itemId : null }, { listing_id: itemId.match(/^[0-9a-fA-F]{24}$/) ? itemId : null }],
  });

  if (!item) {
    throw E.notFound('WISHLIST_ITEM_NOT_FOUND', 'Item not found in wishlist.');
  }

  // 1. Add to cart
  const cart = await cartService.addItem(buyerId, { listingId: item.listing_id, quantity: 1 });

  // 2. Remove from wishlist on success (FR-14 single action)
  await item.deleteOne();

  return cart;
}

module.exports = {
  getWishlist,
  addItem,
  removeItem,
  moveToCart,
};
