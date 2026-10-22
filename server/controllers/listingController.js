const listingService = require('../services/listingService');

module.exports = {
  create: async (req, res) => {
    const result = await listingService.createListing(req.user.id, req.body);
    res.status(201).json(result);
  },
};
