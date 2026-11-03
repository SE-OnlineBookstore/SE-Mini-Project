
const listingService = require('../services/listingService');

module.exports = {
  // S3-01: Retrieve the logged-in seller's listings.
  list: async (req, res) => {
    const result = await listingService.getSellerListings(
      req.user.id
    );

    res.status(200).json(result);
  },

  create: async (req, res) => {
    const result = await listingService.createListing(
      req.user.id,
      req.body
    );

    res.status(201).json(result);
  },

  update: async (req, res) => {
    const result = await listingService.updateListing(
      req.user.id,
      req.params.id,
      req.body
    );

    res.status(200).json(result);
  },
};
