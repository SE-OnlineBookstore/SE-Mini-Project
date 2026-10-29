// Checkout & Order Service (FR-15; SRS 5.3.3; TC-O-03).
// Handles line revalidation, address selection, coupon calculation, and atomic order creation.
const mongoose = require('mongoose');
const { Order, OrderItem, Coupon, Address, Cart, CartItem } = require('../models');
const { E } = require('../utils/AppError');

const { ObjectId } = mongoose.Types;

const FLAT_SHIPPING_FEE = 4000; // 40 rupees in paise (BR-04)
const FREE_SHIPPING_THRESHOLD = 50000; // 500 rupees in paise (BR-04)

async function generateOrderNo() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const datePrefix = `OB-${yyyy}${mm}${dd}-`;

  const latest = await Order.findOne({ order_no: new RegExp(`^${datePrefix}`) })
    .sort({ order_no: -1 })
    .select('order_no')
    .lean();

  let nextSeq = 1;
  if (latest?.order_no) {
    const parts = latest.order_no.split('-');
    const currentSeq = parseInt(parts[2], 10);
    if (!Number.isNaN(currentSeq)) {
      nextSeq = currentSeq + 1;
    }
  }

  return `${datePrefix}${String(nextSeq).padStart(5, '0')}`;
}

async function validateCoupon(code, itemTotal) {
  if (!code) return { coupon: null, discount: 0 };
  const cleanCode = String(code).trim().toUpperCase();

  const coupon = await Coupon.findOne({ code: cleanCode });
  if (!coupon) throw E.notFound('COUPON_NOT_FOUND', 'Coupon code is invalid.');
  if (!coupon.is_active) throw E.badRequest('COUPON_INACTIVE', 'This coupon is no longer active.');

  const now = new Date();
  if (now < coupon.valid_from || now > coupon.valid_to) {
    throw E.badRequest('COUPON_EXPIRED', 'This coupon has expired.');
  }

  if (coupon.used_count >= coupon.max_uses) {
    throw E.badRequest('COUPON_MAX_USES_REACHED', 'This coupon has reached its maximum usage limit.');
  }

  if (itemTotal < coupon.min_order) {
    throw E.badRequest(
      'COUPON_MIN_ORDER_NOT_MET',
      `This coupon requires a minimum item total of ₹${(coupon.min_order / 100).toFixed(2)}.`,
    );
  }

  let discount = 0;
  if (coupon.discount_type === 'FLAT') {
    discount = Math.min(coupon.value, itemTotal);
  } else if (coupon.discount_type === 'PERCENT') {
    discount = Math.min(Math.round((itemTotal * coupon.value) / 100), itemTotal);
  }

  return { coupon, discount };
}

async function revalidateCart(buyerId) {
  const cart = await Cart.findOne({ buyer_id: buyerId });
  if (!cart) {
    return { cartId: null, items: [], itemTotal: 0, errors: [{ code: 'EMPTY_CART', message: 'Cart is empty.' }], warnings: [] };
  }

  const cartItems = await CartItem.find({ cart_id: cart._id })
    .populate({
      path: 'listing_id',
      populate: [
        { path: 'book_id', select: 'title author isbn13 cover_url mrp' },
        { path: 'seller_id', select: 'name' },
      ],
    })
    .sort({ added_at: -1 });

  if (cartItems.length === 0) {
    return { cartId: String(cart._id), items: [], itemTotal: 0, errors: [{ code: 'EMPTY_CART', message: 'Cart is empty.' }], warnings: [] };
  }

  const items = [];
  const errors = [];
  const warnings = [];
  let itemTotal = 0;

  for (const ci of cartItems) {
    const listing = ci.listing_id;
    if (!listing) {
      errors.push({ code: 'LISTING_NOT_FOUND', message: 'One of the items in your cart is no longer available.', cartItemId: String(ci._id) });
      continue;
    }

    const book = listing.book_id;
    const title = book?.title || 'Book';
    const isSelfPurchase = String(listing.seller_id?._id || listing.seller_id) === String(buyerId);
    const isActive = listing.status === 'ACTIVE';
    const isStockSufficient = listing.stock_qty >= ci.quantity;
    const priceChanged = listing.price !== ci.price_at_add;

    if (isSelfPurchase) {
      errors.push({ code: 'SELF_PURCHASE', message: `You cannot purchase your own listing for "${title}".`, cartItemId: String(ci._id) });
    } else if (!isActive) {
      errors.push({ code: 'LISTING_NOT_ACTIVE', message: `Listing for "${title}" is no longer active.`, cartItemId: String(ci._id) });
    } else if (!isStockSufficient) {
      errors.push({
        code: 'INSUFFICIENT_STOCK',
        message: `Only ${listing.stock_qty} available in stock for "${title}" (requested ${ci.quantity}).`,
        cartItemId: String(ci._id),
        stockQty: listing.stock_qty,
      });
    }

    if (priceChanged) {
      warnings.push({
        code: 'PRICE_CHANGED',
        message: `Price for "${title}" updated from ₹${(ci.price_at_add / 100).toFixed(2)} to ₹${(listing.price / 100).toFixed(2)}.`,
        cartItemId: String(ci._id),
        previousPrice: ci.price_at_add,
        currentPrice: listing.price,
      });
    }

    const currentPrice = listing.price;
    const lineTotal = currentPrice * ci.quantity;
    itemTotal += lineTotal;

    items.push({
      cartItemId: String(ci._id),
      listingId: String(listing._id),
      sellerId: String(listing.seller_id?._id || listing.seller_id),
      sellerName: listing.seller_id?.name || 'Seller',
      title,
      author: book?.author || '',
      coverUrl: book?.cover_url || null,
      condition: listing.condition,
      quantity: ci.quantity,
      priceAtAdd: ci.price_at_add,
      currentPrice,
      lineTotal,
      priceChanged,
      isActive,
      stockQty: listing.stock_qty,
      isStockSufficient,
    });
  }

  return {
    cartId: String(cart._id),
    items,
    itemTotal,
    errors,
    warnings,
    hasErrors: errors.length > 0,
  };
}

async function previewCheckout(buyerId, { addressId, couponCode } = {}) {
  const reval = await revalidateCart(buyerId);

  let address = null;
  if (addressId) {
    if (!ObjectId.isValid(addressId)) throw E.badRequest('INVALID_ID', 'Invalid address ID.');
    address = await Address.findOne({ _id: addressId, user_id: buyerId });
    if (!address) throw E.notFound('ADDRESS_NOT_FOUND', 'Selected delivery address not found.');
  } else {
    address = await Address.findOne({ user_id: buyerId, is_default: true })
      || await Address.findOne({ user_id: buyerId }).sort({ created_at: 1 });
  }

  const itemTotal = reval.itemTotal;
  const shippingFee = itemTotal >= FREE_SHIPPING_THRESHOLD || itemTotal === 0 ? 0 : FLAT_SHIPPING_FEE;

  let couponData = null;
  let discount = 0;
  if (couponCode) {
    const res = await validateCoupon(couponCode, itemTotal);
    couponData = {
      code: res.coupon.code,
      discountType: res.coupon.discount_type,
      value: res.coupon.value,
      discount: res.discount,
    };
    discount = res.discount;
  }

  const payableAmount = Math.max(0, itemTotal + shippingFee - discount);

  return {
    cartId: reval.cartId,
    lines: reval.items,
    itemTotal,
    shippingFee,
    discount,
    payableAmount,
    coupon: couponData,
    address: address ? address.toPublic() : null,
    errors: reval.errors,
    warnings: reval.warnings,
    canCheckout: reval.items.length > 0 && !reval.hasErrors && !!address,
  };
}

async function checkout(buyerId, { addressId, couponCode }) {
  if (!ObjectId.isValid(addressId)) {
    throw E.badRequest('INVALID_ID', 'Invalid delivery address ID.');
  }

  const address = await Address.findOne({ _id: addressId, user_id: buyerId });
  if (!address) throw E.notFound('ADDRESS_NOT_FOUND', 'Delivery address not found.');

  const reval = await revalidateCart(buyerId);
  if (reval.items.length === 0) {
    throw E.badRequest('EMPTY_CART', 'Your cart is empty.');
  }

  if (reval.hasErrors) {
    const firstErr = reval.errors[0];
    throw E.badRequest(firstErr.code, firstErr.message, reval.errors);
  }

  const itemTotal = reval.itemTotal;
  const shippingFee = itemTotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;

  let coupon = null;
  let discount = 0;
  if (couponCode) {
    const res = await validateCoupon(couponCode, itemTotal);
    coupon = res.coupon;
    discount = res.discount;
  }

  const payableAmount = Math.max(0, itemTotal + shippingFee - discount);
  const orderNo = await generateOrderNo();

  const order = await Order.create({
    order_no: orderNo,
    buyer_id: buyerId,
    address_id: address._id,
    coupon_id: coupon ? coupon._id : undefined,
    item_total: itemTotal,
    shipping_fee: shippingFee,
    discount,
    total_amount: payableAmount,
    order_status: 'PLACED',
    status_history: [{ status: 'PLACED', at: new Date() }],
  });

  const orderItemsData = reval.items.map((i) => ({
    order_id: order._id,
    listing_id: i.listingId,
    seller_id: i.sellerId,
    title: i.title,
    quantity: i.quantity,
    unit_price: i.currentPrice,
    item_status: 'PLACED',
  }));

  const orderItems = await OrderItem.insertMany(orderItemsData);

  // Clear buyer's cart upon order preparation
  await CartItem.deleteMany({ cart_id: reval.cartId });

  // Increment coupon usage count if applied
  if (coupon) {
    await Coupon.updateOne({ _id: coupon._id }, { $inc: { used_count: 1 } });
  }

    const formattedItems = orderItems.map((oi) => ({
    id: String(oi._id),
    listingId: String(oi.listing_id),
    title: oi.title,
    quantity: oi.quantity,
    unitPrice: oi.unit_price,
    itemStatus: oi.item_status,
  }));

  return {
    order: {
      id: String(order._id),
      orderNo: order.order_no,
      orderStatus: order.order_status,
      itemTotal: order.item_total,
      shippingFee: order.shipping_fee,
      discount: order.discount,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
      address: address.toPublic(),
      coupon: coupon ? { code: coupon.code, discount } : null,
      items: formattedItems,
    },
    items: formattedItems,
  };
}

async function getOrder(buyerId, orderId) {
  if (!ObjectId.isValid(orderId)) throw E.badRequest('INVALID_ID', 'Invalid order ID.');

  const order = await Order.findOne({ _id: orderId, buyer_id: buyerId })
    .populate('address_id')
    .populate('coupon_id', 'code discount_type value');

  if (!order) throw E.notFound('ORDER_NOT_FOUND', 'Order not found.');

  const items = await OrderItem.find({ order_id: order._id })
    .populate({
      path: 'listing_id',
      select: 'condition',
      populate: { path: 'book_id', select: 'author cover_url isbn13' },
    });

  return {
    order: {
      id: String(order._id),
      orderNo: order.order_no,
      orderStatus: order.order_status,
      itemTotal: order.item_total,
      shippingFee: order.shipping_fee,
      discount: order.discount,
      totalAmount: order.total_amount,
      createdAt: order.created_at,
      address: order.address_id ? {
        id: String(order.address_id._id),
        line1: order.address_id.line1,
        line2: order.address_id.line2,
        city: order.address_id.city,
        state: order.address_id.state,
        pincode: order.address_id.pincode,
      } : null,
      coupon: order.coupon_id ? { code: order.coupon_id.code } : null,
    },
    items: items.map((oi) => ({
      id: String(oi._id),
      listingId: String(oi.listing_id?._id || oi.listing_id),
      title: oi.title,
      quantity: oi.quantity,
      unitPrice: oi.unit_price,
      itemStatus: oi.item_status,
      book: oi.listing_id?.book_id ? {
        author: oi.listing_id.book_id.author,
        coverUrl: oi.listing_id.book_id.cover_url,
        isbn13: oi.listing_id.book_id.isbn13,
      } : null,
    })),
  };
}

async function listOrders(buyerId) {
  const orders = await Order.find({ buyer_id: buyerId })
    .sort({ created_at: -1 })
    .populate('address_id', 'city state pincode');

  return {
    orders: orders.map((o) => ({
      id: String(o._id),
      orderNo: o.order_no,
      orderStatus: o.order_status,
      itemTotal: o.item_total,
      shippingFee: o.shipping_fee,
      discount: o.discount,
      totalAmount: o.total_amount,
      createdAt: o.created_at,
      city: o.address_id?.city,
    })),
  };
}

module.exports = {
  revalidateCart,
  validateCoupon,
  previewCheckout,
  checkout,
  getOrder,
  listOrders,
  generateOrderNo,
  FLAT_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
};
