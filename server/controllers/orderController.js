const orderService = require('../services/orderService');

module.exports = {
  checkoutSummary: async (req, res) => res.json(await orderService.getCheckoutSummary(req.user.id, req.body)),
  createOrder: async (req, res) => res.status(201).json(await orderService.createOrder(req.user.id, req.body)),
  listOrders: async (req, res) => res.json(await orderService.listOrders(req.user.id)),
  getOrder: async (req, res) => res.json({ order: await orderService.getOrder(req.user.id, req.params.id) }),
};
