const wishlistService = require('../services/wishlistService');

module.exports = {
  getWishlist: async (req, res) => res.json(await wishlistService.getWishlist(req.user.id)),
  addItem: async (req, res) => res.status(201).json(await wishlistService.addItem(req.user.id, req.body)),
  removeItem: async (req, res) => {
    await wishlistService.removeItem(req.user.id, req.params.id);
    res.status(204).end();
  },
  moveToCart: async (req, res) => res.json(await wishlistService.moveToCart(req.user.id, req.params.id)),
};
