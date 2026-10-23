const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

module.exports = {
  addWishlist: {
    body: Joi.object({
      listingId: objectId.required(),
    }),
  },
  addItem: {
    body: Joi.object({
      listingId: objectId.required(),
    }),
  },
  wishlistParam: {
    params: Joi.object({
      id: objectId.required(),
    }),
  },
  itemId: {
    params: Joi.object({ id: objectId.required() }),
  },
  checkWishlist: {
    params: Joi.object({
      listingId: objectId.required(),
    }),
  },
};
