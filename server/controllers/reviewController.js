const reviewService = require('../services/reviewService');

module.exports = {
  create: async (req, res) => res.status(201).json(await reviewService.create(req.params.id, req.user.id, req.body)),
};
