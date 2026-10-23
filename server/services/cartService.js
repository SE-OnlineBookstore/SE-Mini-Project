// Shopping cart business logic (FR-13). Every query is scoped to the buyer (SR-06).
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

async function getCart(buyerId) {
  const cart = await getOrCreateCart(buyerId);
  const items = await CartItem.find({ cart_id: cart._id })
    .populate({
      path: 'listing_id',
      populate: { path: 'book_id', select: 'title author coverUrl isbn13 mrp' },
    })
    .sort({ added_at: -1 });

  let subtotal = 0;
  let totalItems = 0;
  const formattedItems = [];

  for (const item of items) {
    const listing = item.listing_id;
    if (!listing) continue;

    const book = listing.book_id;
    const currentPrice = listing.price;
    const isAvailable = listing.status === 'ACTIVE' && listing.stock_qty >= item.quantity;
    const priceChanged = currentPrice !== item.price_at_add;
    const lineTotal = currentPrice * item.quantity;

    subtotal += lineTotal;
    totalItems += item.quantity;

    formattedItems.push({
      id: String(item._id),
      listingId: String(listing._id),
      quantity: item.quantity,
      priceAtAdd: item.price_at_add,
      currentPrice,
      priceChanged,
      inStock: listing.stock_qty > 0 && listing.status === 'ACTIVE',
      availableStock: listing.stock_qty,
      isAvailable,
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
      sellerId: String(listing.seller_id),
      lineTotal,
    });
  }

  return {
    cartId: String(cart._id),
    items: formattedItems,
    totalItems,
    subtotal,
  };
}

async function addItem(buyerId, { listingId, quantity = 1 }) {
  const listing = await Listing.findById(listingId);
  if (!listing || listing.status !== 'ACTIVE') {
    throw E.badRequest('LISTING_UNAVAILABLE', 'This listing is not available for purchase.');
  }

  if (String(listing.seller_id) === String(buyerId)) {
    throw E.badRequest('CANNOT_BUY_OWN_LISTING', 'Sellers cannot add their own listings to cart (BR-02).');
  }

  if (listing.stock_qty < 1) {
    throw E.badRequest('OUT_OF_STOCK', 'This book is currently out of stock.');
  }

  const cart = await getOrCreateCart(buyerId);
  const existingItem = await CartItem.findOne({ cart_id: cart._id, listing_id: listingId });

  const targetQuantity = existingItem ? existingItem.quantity + quantity : quantity;

  if (targetQuantity > 10) {
    throw E.badRequest('QUANTITY_LIMIT_EXCEEDED', 'Cart quantity for an item cannot exceed 10.');
  }

  if (targetQuantity > listing.stock_qty) {
    throw E.badRequest('INSUFFICIENT_STOCK', `Only ${listing.stock_qty} copies available in stock.`);
  }

  if (existingItem) {
    existingItem.quantity = targetQuantity;
    await existingItem.save();
  } else {
    await CartItem.create({
      cart_id: cart._id,
      listing_id: listing._id,
      quantity,
      price_at_add: listing.price,
    });
  }

  return getCart(buyerId);
}

async function updateItem(buyerId, itemId, { quantity }) {
  const cart = await getOrCreateCart(buyerId);
  const item = await CartItem.findOne({ _id: itemId, cart_id: cart._id });
  if (!item) {
    throw E.notFound('CART_ITEM_NOT_FOUND', 'Item not found in cart.');
  }

  const listing = await Listing.findById(item.listing_id);
  if (!listing || listing.status !== 'ACTIVE') {
    throw E.badRequest('LISTING_UNAVAILABLE', 'This listing is no longer available.');
  }

  if (quantity > 10) {
    throw E.badRequest('QUANTITY_LIMIT_EXCEEDED', 'Cart quantity for an item cannot exceed 10.');
  }

  if (quantity > listing.stock_qty) {
    throw E.badRequest('INSUFFICIENT_STOCK', `Only ${listing.stock_qty} copies available in stock.`);
  }

  item.quantity = quantity;
  await item.save();

  return getCart(buyerId);
}

async function removeItem(buyerId, itemId) {
  const cart = await getOrCreateCart(buyerId);
  const item = await CartItem.findOne({ _id: itemId, cart_id: cart._id });
  if (!item) {
    throw E.notFound('CART_ITEM_NOT_FOUND', 'Item not found in cart.');
  }

  await item.deleteOne();
  return getCart(buyerId);
}

async function clearCart(buyerId) {
  const cart = await getOrCreateCart(buyerId);
  await CartItem.deleteMany({ cart_id: cart._id });
  return { cartId: String(cart._id), items: [], totalItems: 0, subtotal: 0 };
}

module.exports = {
  getOrCreateCart,
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
};
