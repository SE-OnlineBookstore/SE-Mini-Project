const cartService = require('../services/cartService');

module.exports = {
  getCart: async (req, res) => res.json(await cartService.getCart(req.user.id)),
  addItem: async (req, res) => {
    const { listingId, quantity = 1 } = req.body;
    res.status(201).json(await cartService.addToCart(req.user.id, listingId, quantity));
  },
  updateItem: async (req, res) => {
    res.json(await cartService.updateQuantity(req.user.id, req.params.id, req.body.quantity));
  },
  removeItem: async (req, res) => {
    await cartService.removeFromCart(req.user.id, req.params.id);
    res.status(204).end();
  },
};
