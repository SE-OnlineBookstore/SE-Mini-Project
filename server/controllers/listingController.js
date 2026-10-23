const listingService = require('../services/listingService');

module.exports = {
  create: async (req, res) => {
    const result = await listingService.createListing(req.user.id, req.body);
    res.status(201).json(result);
  },

  update: async (req, res) => {
    const result = await listingService.updateListing(
      req.user.id,
      req.params.id,
      req.body,
    );
    res.status(200).json(result);
  },
};
