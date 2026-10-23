const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

module.exports = {
  addItem: {
    body: Joi.object({
      listingId: objectId.required(),
      quantity: Joi.number().integer().min(1).max(10).default(1),
    }),
  },
  updateItem: {
    params: Joi.object({ id: objectId.required() }),
    body: Joi.object({
      quantity: Joi.number().integer().min(1).max(10).required(),
    }),
  },
  itemId: {
    params: Joi.object({ id: objectId.required() }),
  },
};
