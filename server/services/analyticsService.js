const { Order, User } = require('../models');
const { commissionRate } = require('../config/env');
const { E } = require('../utils/AppError');

function parseMonth(month) {
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw E.badRequest(
      'INVALID_MONTH',
      'Month must be in YYYY-MM format.',
    );
  }

  const [year, monthNumber] = month.split('-').map(Number);

  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

async function getMonthlyAnalytics(month) {
  const { start, end } = parseMonth(month);

  const orders = await Order.find({
    created_at: { $gte: start, $lt: end },
  }).lean();

  const newUsers = await User.countDocuments({
    created_at: { $gte: start, $lt: end },
  });

  // Exclude cancelled orders from financial metrics.
  const validOrders = orders.filter(
    (order) => order.order_status !== 'CANCELLED',
  );

  const orderCount = validOrders.length;

  const gmv = validOrders.reduce(
    (total, order) => total + order.total_amount,
    0,
  );

  const commission = Number((gmv * commissionRate).toFixed(2));

  const averageOrderValue = orderCount
    ? Number((gmv / orderCount).toFixed(2))
    : 0;

  return {
    month,
    orders: orderCount,
    gmv,
    platformCommission: commission,
    averageOrderValue,
    newUsers,
  };
}

function toCsv(report) {
  const rows = [
    ['Metric', 'Value'],
    ['Month', report.month],
    ['Orders', report.orders],
    ['GMV', report.gmv],
    ['Platform Commission', report.platformCommission],
    ['Average Order Value', report.averageOrderValue],
    ['New Users', report.newUsers],
  ];

  return rows
    .map((row) =>
      row.map((value) => {
        const text = String(value);
        return `"${text.replace(/"/g, '""')}"`;
      }).join(','),
    )
    .join('\r\n');
}

module.exports = {
  parseMonth,
  getMonthlyAnalytics,
  toCsv,
};