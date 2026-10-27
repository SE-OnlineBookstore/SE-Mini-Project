const Joi = require('joi');

// FR-11: integer rating 1-5, optional comment of up to 1000 characters.
module.exports = {
  create: {
    params: Joi.object({ id: Joi.string().hex().length(24).required() }),
    body: Joi.object({
      rating: Joi.number().integer().min(1).max(5).required(),
      comment: Joi.string().trim().max(1000).allow(''),
    }),
  },
};
