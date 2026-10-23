// Wishlist Service (FR-14; SRS 5.3.3; TC-O-02).
// Enables buyers to save books for later and atomically move them into the shopping cart.
const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Listing = require('../models/Listing');
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const { E } = require('../utils/AppError');

const { ObjectId } = mongoose.Types;

function formatWishlistItem(item) {
  const listing = item.listing_id;
  const book = listing?.book_id;

  return {
    id: String(item._id),
    listingId: String(listing?._id || item.listing_id),
    addedAt: item.added_at,
    book: book ? {
      id: String(book._id),
      title: book.title,
      author: book.author,
      isbn13: book.isbn13,
      coverUrl: book.cover_url || null,
      mrp: book.mrp,
      language: book.language,
      publisher: book.publisher,
    } : null,
    listing: listing ? {
      id: String(listing._id),
      condition: listing.condition,
      price: listing.price,
      stockQty: listing.stock_qty,
      status: listing.status,
      inStock: listing.status === 'ACTIVE' && listing.stock_qty > 0,
      seller: listing.seller_id ? {
        id: String(listing.seller_id._id),
        name: listing.seller_id.name,
      } : null,
    } : null,
  };
}

async function getWishlist(buyerId) {
  const items = await Wishlist.find({ buyer_id: buyerId })
    .populate({
      path: 'listing_id',
      populate: [
        { path: 'book_id', select: 'title author isbn13 cover_url mrp language publisher' },
        { path: 'seller_id', select: 'name' },
      ],
    })
    .sort({ added_at: -1 });

  const formatted = items.map(formatWishlistItem);
  return {
    items: formatted,
    total: formatted.length,
  };
}

async function addToWishlist(buyerId, listingId) {
  if (!ObjectId.isValid(listingId)) {
    throw E.badRequest('INVALID_ID', 'Invalid listing ID.');
  }

  const listing = await Listing.findById(listingId);
  if (!listing) throw E.notFound('LISTING_NOT_FOUND', 'Listing not found.');

  const item = await Wishlist.findOneAndUpdate(
    { buyer_id: buyerId, listing_id: listingId },
    { $setOnInsert: { buyer_id: buyerId, listing_id: listingId, added_at: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const populated = await Wishlist.findById(item._id).populate({
    path: 'listing_id',
    populate: [
      { path: 'book_id', select: 'title author isbn13 cover_url mrp language publisher' },
      { path: 'seller_id', select: 'name' },
    ],
  });

  return { item: formatWishlistItem(populated) };
}

async function removeFromWishlist(buyerId, idOrListingId) {
  if (!ObjectId.isValid(idOrListingId)) {
    throw E.badRequest('INVALID_ID', 'Invalid ID.');
  }

  const query = {
    buyer_id: buyerId,
    $or: [{ _id: idOrListingId }, { listing_id: idOrListingId }],
  };

  const item = await Wishlist.findOne(query);
  if (!item) {
    throw E.notFound('WISHLIST_ITEM_NOT_FOUND', 'Item not in wishlist.');
  }

  await Wishlist.deleteOne({ _id: item._id });
}

async function moveToCart(buyerId, idOrListingId) {
  if (!ObjectId.isValid(idOrListingId)) {
    throw E.badRequest('INVALID_ID', 'Invalid ID.');
  }

  const query = {
    buyer_id: buyerId,
    $or: [{ _id: idOrListingId }, { listing_id: idOrListingId }],
  };

  const item = await Wishlist.findOne(query).populate('listing_id');
  if (!item) {
    throw E.notFound('WISHLIST_ITEM_NOT_FOUND', 'Wishlist item not found.');
  }

  const listing = item.listing_id;
  if (!listing) throw E.notFound('LISTING_NOT_FOUND', 'Listing not found.');
  if (listing.status === 'OUT_OF_STOCK' || listing.stock_qty <= 0) {
    throw E.badRequest('OUT_OF_STOCK', 'This item is currently out of stock.');
  }
  if (listing.status !== 'ACTIVE') {
    throw E.badRequest('LISTING_NOT_ACTIVE', 'This listing is no longer active.');
  }
  if (String(listing.seller_id) === String(buyerId)) {
    throw E.badRequest('SELF_PURCHASE', 'A buyer cannot purchase their own listing.');
  }

  // Add to cart with current price and quantity 1
  let cart = await Cart.findOne({ buyer_id: buyerId });
  if (!cart) {
    cart = await Cart.create({ buyer_id: buyerId });
  }

  let cartItem = await CartItem.findOne({ cart_id: cart._id, listing_id: listing._id });
  if (cartItem) {
    const desired = cartItem.quantity + 1;
    const maxAllowed = Math.min(10, listing.stock_qty);
    cartItem.quantity = Math.min(desired, maxAllowed);
    cartItem.price_at_add = listing.price;
    await cartItem.save();
  } else {
    cartItem = await CartItem.create({
      cart_id: cart._id,
      listing_id: listing._id,
      quantity: 1,
      price_at_add: listing.price,
    });
  }

  // Remove from wishlist on success (FR-14: move in a single action)
  await Wishlist.deleteOne({ _id: item._id });

  return {
    message: 'Item moved to cart successfully.',
    listingId: String(listing._id),
    cartId: String(cart._id),
  };
}

async function checkInWishlist(buyerId, listingId) {
  if (!ObjectId.isValid(listingId)) {
    throw E.badRequest('INVALID_ID', 'Invalid listing ID.');
  }

  const exists = await Wishlist.exists({ buyer_id: buyerId, listing_id: listingId });
  return { inWishlist: Boolean(exists) };
}

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
  checkInWishlist,
};
