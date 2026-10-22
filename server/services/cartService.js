// Cart Service (FR-13 / FR-14; SAD 4.3). Every operation is scoped to the buyer (SR-06).
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Listing = require('../models/Listing');
const { E } = require('../utils/AppError');

async function getOrCreateCart(buyerId) {
  let cart = await Cart.findOne({ buyer_id: buyerId });
  if (!cart) {
    cart = await Cart.create({ buyer_id: buyerId });
  }
  return cart;
}

function formatCartItem(ci) {
  const listing = ci.listing_id;
  const book = listing?.book_id;
  const unitPrice = listing?.price != null ? listing.price : ci.price_at_add;
  const isActive = listing?.status === 'ACTIVE';
  const inStock = isActive && (listing?.stock_qty || 0) >= ci.quantity;

  return {
    id: String(ci._id),
    listingId: String(listing?._id || ci.listing_id),
    quantity: ci.quantity,
    priceAtAdd: ci.price_at_add,
    currentPrice: unitPrice,
    lineTotal: unitPrice * ci.quantity,
    isActive,
    inStock,
    stockQty: listing?.stock_qty || 0,
    book: book ? {
      id: String(book._id),
      title: book.title,
      author: book.author,
      isbn13: book.isbn13,
      coverUrl: book.cover_url || null,
      mrp: book.mrp,
    } : null,
    listing: listing ? {
      condition: listing.condition,
      price: listing.price,
      seller: listing.seller_id ? {
        id: String(listing.seller_id._id),
        name: listing.seller_id.name,
      } : null,
    } : null,
  };
}

async function getCart(buyerId) {
  const cart = await getOrCreateCart(buyerId);
  const cartItems = await CartItem.find({ cart_id: cart._id })
    .populate({
      path: 'listing_id',
      populate: [
        { path: 'book_id', select: 'title author isbn13 cover_url mrp' },
        { path: 'seller_id', select: 'name' },
      ],
    })
    .sort({ added_at: -1 });

  const items = cartItems.map(formatCartItem);
  const activeItems = items.filter((x) => x.isActive && x.inStock);
  const itemTotal = activeItems.reduce((sum, x) => sum + x.lineTotal, 0);
  const itemCount = items.reduce((sum, x) => sum + x.quantity, 0);

  return {
    cartId: String(cart._id),
    items,
    itemTotal,
    itemCount,
  };
}

async function addToCart(buyerId, listingId, quantity = 1) {
  const listing = await Listing.findById(listingId);
  if (!listing) throw E.notFound('LISTING_NOT_FOUND', 'Listing not found.');
  if (listing.status === 'OUT_OF_STOCK' || listing.stock_qty <= 0) {
    throw E.badRequest('OUT_OF_STOCK', 'This item is currently out of stock.');
  }
  if (listing.status !== 'ACTIVE') throw E.badRequest('LISTING_NOT_ACTIVE', 'This listing is no longer active.');
  if (String(listing.seller_id) === String(buyerId)) {
    throw E.badRequest('SELF_PURCHASE', 'A buyer cannot purchase their own listing.');
  }

  const cart = await getOrCreateCart(buyerId);
  let cartItem = await CartItem.findOne({ cart_id: cart._id, listing_id: listingId });

  if (cartItem) {
    const desired = cartItem.quantity + quantity;
    const maxAllowed = Math.min(10, listing.stock_qty);
    cartItem.quantity = Math.min(desired, maxAllowed);
    cartItem.price_at_add = listing.price;
    await cartItem.save();
  } else {
    const initialQty = Math.min(Math.min(quantity, 10), listing.stock_qty);
    cartItem = await CartItem.create({
      cart_id: cart._id,
      listing_id: listingId,
      quantity: initialQty,
      price_at_add: listing.price,
    });
  }

  return getCart(buyerId);
}

async function updateQuantity(buyerId, cartItemId, quantity) {
  const cart = await getOrCreateCart(buyerId);
  const cartItem = await CartItem.findOne({ _id: cartItemId, cart_id: cart._id }).populate('listing_id');
  if (!cartItem) throw E.notFound('CART_ITEM_NOT_FOUND', 'Item not found in cart.');

  const listing = cartItem.listing_id;
  if (!listing || listing.status !== 'ACTIVE') {
    throw E.badRequest('LISTING_NOT_ACTIVE', 'Listing is no longer active.');
  }

  const capped = Math.min(Math.min(quantity, 10), listing.stock_qty);
  cartItem.quantity = capped;
  await cartItem.save();

  return getCart(buyerId);
}

async function removeFromCart(buyerId, cartItemId) {
  const cart = await getOrCreateCart(buyerId);
  const res = await CartItem.deleteOne({ _id: cartItemId, cart_id: cart._id });
  if (res.deletedCount === 0) {
    throw E.notFound('CART_ITEM_NOT_FOUND', 'Item not found in cart.');
  }
}

module.exports = {
  getOrCreateCart,
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
};
