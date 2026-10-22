const wishlistService = require('../services/wishlistService');

module.exports = {
  list: async (req, res) => res.json(await wishlistService.getWishlist(req.user.id)),
  add: async (req, res) => res.status(201).json(await wishlistService.addToWishlist(req.user.id, req.body.listingId)),
  remove: async (req, res) => {
    await wishlistService.removeFromWishlist(req.user.id, req.params.id);
    res.status(204).end();
  },
  moveToCart: async (req, res) => res.json(await wishlistService.moveToCart(req.user.id, req.params.id)),
  check: async (req, res) => res.json(await wishlistService.checkInWishlist(req.user.id, req.params.listingId)),
};
