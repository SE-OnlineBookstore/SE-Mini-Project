const sellerDashboardService = require('../services/sellerDashboardService');

async function getDashboard(req, res) {
  const dashboard = await sellerDashboardService.getDashboard(
    req.user.id,
    req.query.from,
    req.query.to,
  );

  res.status(200).json({
    success: true,
    data: dashboard,
  });
}

module.exports = { getDashboard };