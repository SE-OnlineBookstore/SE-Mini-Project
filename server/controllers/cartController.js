const cartService = require('../services/cartService');

module.exports = {
  getCart: async (req, res) => res.json(await cartService.getCart(req.user.id)),
  addItem: async (req, res) => res.status(201).json(await cartService.addItem(req.user.id, req.body)),
  updateItem: async (req, res) => res.json(await cartService.updateItem(req.user.id, req.params.id, req.body)),
  removeItem: async (req, res) => res.json(await cartService.removeItem(req.user.id, req.params.id)),
  clearCart: async (req, res) => res.json(await cartService.clearCart(req.user.id)),
};
