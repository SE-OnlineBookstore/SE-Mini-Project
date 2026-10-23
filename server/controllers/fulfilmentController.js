const fulfilmentService = require('../services/fulfilmentService');

module.exports = {
  accept: async (req, res) => {
    const result = await fulfilmentService.transitionItem(
      req.user.id,
      req.params.itemId,
      'accept'
    );
    res.json(result);
  },

  pack: async (req, res) => {
    const result = await fulfilmentService.transitionItem(
      req.user.id,
      req.params.itemId,
      'pack'
    );
    res.json(result);
  },

  dispatch: async (req, res) => {
    const result = await fulfilmentService.transitionItem(
      req.user.id,
      req.params.itemId,
      'dispatch',
      req.body
    );
    res.json(result);
  },
};
