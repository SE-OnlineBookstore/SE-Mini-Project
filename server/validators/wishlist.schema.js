const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

module.exports = {
  addItem: {
    body: Joi.object({
      listingId: objectId.required(),
    }),
  },
  itemId: {
    params: Joi.object({ id: objectId.required() }),
  },
};
