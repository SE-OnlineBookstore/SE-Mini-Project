// Checkout and order management (FR-15).
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Cart = require('../models/Cart');
const CartItem = require('../models/CartItem');
const Address = require('../models/Address');
const Coupon = require('../models/Coupon');
const { E } = require('../utils/AppError');

const FREE_SHIPPING_THRESHOLD = 50000; // 500 rupees in paise (SRS 5.3.3 / FR-15)
const STANDARD_SHIPPING_FEE = 4000; // 40 rupees in paise

function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const randomSuffix = String(Math.floor(10000 + Math.random() * 90000));
  return `OB-${dateStr}-${randomSuffix}`;
}

async function validateAndComputeTotals(buyerId, { addressId, couponCode }) {
  const cart = await Cart.findOne({ buyer_id: buyerId });
  if (!cart) {
    throw E.badRequest('CART_EMPTY', 'Your shopping cart is empty.');
  }

  const cartItems = await CartItem.find({ cart_id: cart._id }).populate({
    path: 'listing_id',
    populate: { path: 'book_id', select: 'title author' },
  });

  if (!cartItems || cartItems.length === 0) {
    throw E.badRequest('CART_EMPTY', 'Your shopping cart is empty.');
  }

  let address = null;
  if (addressId) {
    address = await Address.findOne({ _id: addressId, user_id: buyerId });
    if (!address) {
      throw E.notFound('ADDRESS_NOT_FOUND', 'Delivery address not found.');
    }
  }

  let itemTotal = 0;
  const validatedLines = [];

  for (const item of cartItems) {
    const listing = item.listing_id;
    if (!listing || listing.status !== 'ACTIVE') {
      throw E.badRequest('LISTING_UNAVAILABLE', `A book in your cart is no longer active.`);
    }

    if (String(listing.seller_id) === String(buyerId)) {
      throw E.badRequest('CANNOT_BUY_OWN_LISTING', 'A line whose listing belongs to the buyer is refused at checkout (BR-02).');
    }

    if (listing.stock_qty < item.quantity) {
      throw E.badRequest(
        'INSUFFICIENT_STOCK',
        `Stock changed for "${listing.book_id ? listing.book_id.title : 'book'}". Only ${listing.stock_qty} available.`,
      );
    }

    const currentPrice = listing.price;
    const lineTotal = currentPrice * item.quantity;
    itemTotal += lineTotal;

    validatedLines.push({
      cartItemId: item._id,
      listingId: listing._id,
      sellerId: listing.seller_id,
      title: listing.book_id ? listing.book_id.title : 'Untitled',
      quantity: item.quantity,
      unitPrice: currentPrice,
      lineTotal,
    });
  }

  // Coupon handling
  let coupon = null;
  let discount = 0;

  if (couponCode) {
    const cleanCode = String(couponCode).trim().toUpperCase();
    coupon = await Coupon.findOne({ code: cleanCode });
    if (!coupon || !coupon.is_active) {
      throw E.badRequest('COUPON_INVALID', 'Coupon code is invalid or inactive.');
    }

    const now = new Date();
    if (now < coupon.valid_from || now > coupon.valid_to) {
      throw E.badRequest('COUPON_EXPIRED', 'This coupon is expired or not yet valid.');
    }

    if (coupon.used_count >= coupon.max_uses) {
      throw E.badRequest('COUPON_MAX_USES_REACHED', 'This coupon has reached its maximum usage limit.');
    }

    if (itemTotal < coupon.min_order) {
      throw E.badRequest('COUPON_MIN_ORDER_NOT_MET', `Coupon requires a minimum order value of ₹${(coupon.min_order / 100).toFixed(2)}.`);
    }

    if (coupon.discount_type === 'FLAT') {
      discount = Math.min(coupon.value, itemTotal);
    } else if (coupon.discount_type === 'PERCENT') {
      discount = Math.round(itemTotal * (coupon.value / 100));
    }
  }

  // Shipping calculation
  const shippingFee = itemTotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const totalAmount = Math.max(0, itemTotal + shippingFee - discount);

  return {
    cart,
    address,
    coupon,
    itemTotal,
    shippingFee,
    discount,
    totalAmount,
    validatedLines,
  };
}

async function getCheckoutSummary(buyerId, { addressId, couponCode }) {
  const calculation = await validateAndComputeTotals(buyerId, { addressId, couponCode });

  return {
    itemTotal: calculation.itemTotal,
    shippingFee: calculation.shippingFee,
    discount: calculation.discount,
    totalAmount: calculation.totalAmount,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    address: calculation.address ? calculation.address.toPublic() : null,
    coupon: calculation.coupon
      ? {
          code: calculation.coupon.code,
          discountType: calculation.coupon.discount_type,
          value: calculation.coupon.value,
        }
      : null,
    lines: calculation.validatedLines.map((l) => ({
      listingId: String(l.listingId),
      title: l.title,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    })),
  };
}

async function createOrder(buyerId, { addressId, couponCode }) {
  if (!addressId) {
    throw E.badRequest('ADDRESS_REQUIRED', 'A delivery address is required to checkout.');
  }

  const calculation = await validateAndComputeTotals(buyerId, { addressId, couponCode });

  let orderNo;
  let isUnique = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    orderNo = generateOrderNumber();
    const exists = await Order.exists({ order_no: orderNo });
    if (!exists) {
      isUnique = true;
      break;
    }
  }

  if (!isUnique) {
    throw E.conflict('ORDER_CREATION_FAILED', 'Could not generate unique order number. Please try again.');
  }

  const order = await Order.create({
    order_no: orderNo,
    buyer_id: buyerId,
    address_id: calculation.address._id,
    coupon_id: calculation.coupon ? calculation.coupon._id : undefined,
    item_total: calculation.itemTotal,
    shipping_fee: calculation.shippingFee,
    discount: calculation.discount,
    total_amount: calculation.totalAmount,
    order_status: 'PLACED',
    status_history: [{ status: 'PLACED', at: new Date() }],
  });

  const orderItems = calculation.validatedLines.map((l) => ({
    order_id: order._id,
    listing_id: l.listingId,
    seller_id: l.sellerId,
    title: l.title,
    quantity: l.quantity,
    unit_price: l.unitPrice,
    item_status: 'PLACED',
  }));

  const createdItems = await OrderItem.insertMany(orderItems);

  // Clear cart items on successful order preparation
  await CartItem.deleteMany({ cart_id: calculation.cart._id });

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
      statusHistory: order.status_history,
      items: createdItems.map((i) => ({
        id: String(i._id),
        listingId: String(i.listing_id),
        title: i.title,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        itemStatus: i.item_status,
      })),
    },
  };
}

async function listOrders(buyerId) {
  const orders = await Order.find({ buyer_id: buyerId }).sort({ created_at: -1 });
  const orderIds = orders.map((o) => o._id);
  const allItems = await OrderItem.find({ order_id: { $in: orderIds } });

  const itemsByOrder = {};
  for (const item of allItems) {
    const key = String(item.order_id);
    if (!itemsByOrder[key]) itemsByOrder[key] = [];
    itemsByOrder[key].push({
      id: String(item._id),
      listingId: String(item.listing_id),
      title: item.title,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      itemStatus: item.item_status,
    });
  }

  return {
    items: orders.map((o) => ({
      id: String(o._id),
      orderNo: o.order_no,
      orderStatus: o.order_status,
      itemTotal: o.item_total,
      shippingFee: o.shipping_fee,
      discount: o.discount,
      totalAmount: o.total_amount,
      createdAt: o.created_at,
      items: itemsByOrder[String(o._id)] || [],
    })),
  };
}

async function getOrder(buyerId, orderId) {
  const order = await Order.findOne({ _id: orderId, buyer_id: buyerId });
  if (!order) {
    throw E.notFound('ORDER_NOT_FOUND', 'Order not found.');
  }

  const items = await OrderItem.find({ order_id: order._id });
  return {
    id: String(order._id),
    orderNo: order.order_no,
    orderStatus: order.order_status,
    itemTotal: order.item_total,
    shippingFee: order.shipping_fee,
    discount: order.discount,
    totalAmount: order.total_amount,
    createdAt: order.created_at,
    statusHistory: order.status_history,
    items: items.map((i) => ({
      id: String(i._id),
      listingId: String(i.listing_id),
      title: i.title,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      itemStatus: i.item_status,
    })),
  };
}

module.exports = {
  validateAndComputeTotals,
  getCheckoutSummary,
  createOrder,
  listOrders,
  getOrder,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
};
