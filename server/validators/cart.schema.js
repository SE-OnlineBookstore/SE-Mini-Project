const Joi = require('joi');

module.exports = {
  addItem: {
    body: Joi.object({
      listingId: Joi.string().hex().length(24).required(),
      quantity: Joi.number().integer().min(1).max(10).default(1),
    }),
  },
  updateItem: {
    params: Joi.object({
      id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
      quantity: Joi.number().integer().min(1).max(10).required(),
    }),
  },
  cartItemParam: {
    params: Joi.object({
      id: Joi.string().hex().length(24).required(),
    }),
  },
};
