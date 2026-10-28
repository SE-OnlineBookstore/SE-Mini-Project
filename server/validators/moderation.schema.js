const Joi = require('joi');

const targetParams = {
  targetType: Joi.string().valid('listing', 'user', 'review').required(),
  id: Joi.string().hex().length(24).required(),
};

const body = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required(),
}).required();

module.exports = {
  block: {
    params: Joi.object(targetParams),
    body,
  },
  unblock: {
    params: Joi.object(targetParams),
    body,
  },
};