// Online payment coordination and HMAC webhook handling (FR-16).
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Listing = require('../models/Listing');
const Coupon = require('../models/Coupon');
const auditService = require('./auditService');
const { safeEqual } = require('../utils/crypto');
const { E } = require('../utils/AppError');

const DEFAULT_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'sandbox_secret_key_at_least_32_characters';

function computeSignature(data, secret = DEFAULT_SECRET) {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHmac('sha256', secret).update(content).digest('hex');
}

function verifySignature(payload, signature, secret = DEFAULT_SECRET) {
  if (!signature) return false;
  const expected = computeSignature(payload, secret);
  return safeEqual(expected, signature);
}

async function createPaymentIntent(userId, { orderId }) {
  const order = await Order.findOne({ _id: orderId, buyer_id: userId });
  if (!order) {
    throw E.notFound('ORDER_NOT_FOUND', 'Order not found.');
  }

  if (order.order_status !== 'PLACED') {
    throw E.badRequest('ORDER_NOT_PAYABLE', `Cannot pay for an order in ${order.order_status} status.`);
  }

  const previousAttempts = await Payment.countDocuments({ order_id: order._id });
  if (previousAttempts >= 3) {
    throw E.badRequest('MAX_ATTEMPTS_EXCEEDED', 'Payment attempts exceeded the maximum allowed limit of 3 (FR-16).');
  }

  const attemptNo = previousAttempts + 1;
  const gatewayOrderId = `gw_ord_${order._id}_${attemptNo}_${Date.now()}`;

  const payment = await Payment.create({
    order_id: order._id,
    gateway_order_id: gatewayOrderId,
    amount: order.total_amount,
    attempt_no: attemptNo,
    payment_status: 'CREATED',
  });

  return {
    paymentId: String(payment._id),
    gatewayOrderId,
    amount: order.total_amount,
    currency: 'INR',
    attemptNo,
    orderNo: order.order_no,
  };
}

async function handleWebhook(payload, signature, secret = DEFAULT_SECRET) {
  // 1. Signature verification
  const isValid = verifySignature(payload, signature, secret);
  if (!isValid) {
    throw E.unauthorized('INVALID_SIGNATURE', 'Payment webhook signature verification failed.');
  }

  const { gatewayOrderId, txnRef, status, method } = payload;

  // 2. Idempotency check: if txnRef was already processed successfully, ignore duplicates
  if (txnRef) {
    const existing = await Payment.findOne({ gateway_txn_ref: txnRef, payment_status: 'SUCCESS' });
    if (existing) {
      return { status: 'ok', idempotent: true, message: 'Payment already processed.' };
    }
  }

  const payment = await Payment.findOne({ gateway_order_id: gatewayOrderId });
  if (!payment) {
    throw E.notFound('PAYMENT_NOT_FOUND', 'Payment intent not found for this gateway order.');
  }

  const order = await Order.findById(payment.order_id);
  if (!order) {
    throw E.notFound('ORDER_NOT_FOUND', 'Order not found.');
  }

  if (status === 'SUCCESS') {
    payment.payment_status = 'SUCCESS';
    payment.gateway_txn_ref = txnRef;
    if (method) payment.method = method;
    await payment.save();

    // Confirm order and atomically decrement stock if not already confirmed
    if (order.order_status === 'PLACED') {
      const items = await OrderItem.find({ order_id: order._id });

      // Atomic stock decrement for each listing
      for (const item of items) {
        const updatedListing = await Listing.findOneAndUpdate(
          { _id: item.listing_id, stock_qty: { $gte: item.quantity } },
          { $inc: { stock_qty: -item.quantity } },
          { new: true },
        );

        if (updatedListing && updatedListing.stock_qty === 0) {
          updatedListing.status = 'OUT_OF_STOCK';
          await updatedListing.save();
        }
      }

      order.order_status = 'CONFIRMED';
      order.status_history.push({ status: 'CONFIRMED', at: new Date() });
      await order.save();

      if (order.coupon_id) {
        await Coupon.updateOne({ _id: order.coupon_id }, { $inc: { used_count: 1 } });
      }

      try {
        await auditService.record({
          actorId: order.buyer_id,
          action: 'PAYMENT_SUCCESS',
          targetType: 'ORDER',
          targetId: String(order._id),
          reason: `Payment confirmed via webhook (${txnRef})`,
        });
      } catch (e) {
        // Audit log errors do not block payment confirmation
      }
    }

    return { status: 'ok', orderStatus: 'CONFIRMED', orderNo: order.order_no };
  }

  // FAILED handling: order remains PLACED, stock not decremented
  payment.payment_status = 'FAILED';
  payment.gateway_txn_ref = txnRef;
  if (method) payment.method = method;
  await payment.save();

  try {
    await auditService.record({
      actorId: order.buyer_id,
      action: 'PAYMENT_FAILED',
      targetType: 'ORDER',
      targetId: String(order._id),
      reason: `Payment attempt failed via webhook (${txnRef})`,
    });
  } catch (e) {
    // Audit failure ignored
  }

  return { status: 'ok', orderStatus: order.order_status, orderNo: order.order_no, paymentStatus: 'FAILED' };
}

module.exports = {
  createPaymentIntent,
  handleWebhook,
  computeSignature,
  verifySignature,
  DEFAULT_SECRET,
};
