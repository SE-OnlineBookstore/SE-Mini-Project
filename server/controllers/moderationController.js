const moderationService = require('../services/moderationService');

module.exports = {
  block: async (req, res) => {
    const result = await moderationService.setBlocked({
      targetType: req.params.targetType,
      targetId: req.params.id,
      blocked: true,
      reason: req.body.reason,
      actorId: req.user.id,
      requestId: req.id,
    });

    res.status(200).json({ message: 'Content blocked successfully.', ...result });
  },

  unblock: async (req, res) => {
    const result = await moderationService.setBlocked({
      targetType: req.params.targetType,
      targetId: req.params.id,
      blocked: false,
      reason: req.body.reason,
      actorId: req.user.id,
      requestId: req.id,
    });

    res.status(200).json({ message: 'Content unblocked successfully.', ...result });
  },
};