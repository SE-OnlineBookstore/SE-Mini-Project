
const { Order, OrderItem } = require('../models');
const { E } = require('../utils/AppError');
const { commissionRate } = require('../config/env');

function parseDateRange(from, to) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (
    typeof from !== 'string'
    || typeof to !== 'string'
    || !datePattern.test(from)
    || !datePattern.test(to)
  ) {
    throw E.badRequest(
      'INVALID_DATE_RANGE',
      'Both from and to dates are required in YYYY-MM-DD format.',
    );
  }

  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  if (
    Number.isNaN(start.getTime())
    || Number.isNaN(end.getTime())
    || start.toISOString().slice(0, 10) !== from
    || end.toISOString().slice(0, 10) !== to
    || start > end
  ) {
    throw E.badRequest(
      'INVALID_DATE_RANGE',
      'The date range is invalid; from must be on or before to.',
    );
  }

  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

async function getDashboard(sellerId, from, to) {
  const { start, end } = parseDateRange(from, to);

  const orders = await Order.find({
    created_at: { $gte: start, $lt: end },
  }).sort({ created_at: -1 }).lean();

  const orderIds = orders.map((order) => order._id);

  const items = orderIds.length
    ? await OrderItem.find({
      seller_id: sellerId,
      order_id: { $in: orderIds },
    }).lean()
    : [];

  const itemsByOrder = new Map();

  items.forEach((item) => {
    const key = String(item.order_id);

    if (!itemsByOrder.has(key)) {
      itemsByOrder.set(key, []);
    }

    itemsByOrder.get(key).push(item);
  });

  const matchingOrders = orders.filter(
    (order) => itemsByOrder.has(String(order._id)),
  );

  const unitsSold = items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const grossRevenue = items.reduce(
    (sum, item) => sum + (item.unit_price * item.quantity),
    0,
  );

  const returnedItems = items.filter(
    (item) => item.item_status === 'RETURNED',
  );

  const returnedUnits = returnedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const returnedRevenue = returnedItems.reduce(
    (sum, item) => sum + (item.unit_price * item.quantity),
    0,
  );

  const commission = Number(
    (grossRevenue * commissionRate).toFixed(2),
  );

  const netSettlement = Number(
    (grossRevenue - returnedRevenue - commission).toFixed(2),
  );

  const orderSummaries = matchingOrders.map((order) => {
    const sellerItems = itemsByOrder.get(String(order._id));

    return {
      orderId: String(order._id),
      orderNo: order.order_no,
      date: order.created_at,
      status: order.order_status,
      units: sellerItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      grossRevenue: sellerItems.reduce(
        (sum, item) => sum + (item.unit_price * item.quantity),
        0,
      ),
      returnedRevenue: sellerItems
        .filter((item) => item.item_status === 'RETURNED')
        .reduce(
          (sum, item) => sum + (item.unit_price * item.quantity),
          0,
        ),
    };
  });

  return {
    dateRange: { from, to },
    summary: {
      unitsSold,
      grossRevenue,
      returnedUnits,
      returnedRevenue,
      commission,
      netSettlement,
      settlementNote:
        'A configurable commission rate is applied; the SRS does not specify a rate.',
    },
    orders: orderSummaries,
  };
}

module.exports = { getDashboard, parseDateRange };
