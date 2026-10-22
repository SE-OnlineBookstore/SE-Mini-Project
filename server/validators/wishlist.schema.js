const Joi = require('joi');

module.exports = {
  addWishlist: {
    body: Joi.object({
      listingId: Joi.string().hex().length(24).required(),
    }),
  },
  wishlistParam: {
    params: Joi.object({
      id: Joi.string().hex().length(24).required(),
    }),
  },
  checkWishlist: {
    params: Joi.object({
      listingId: Joi.string().hex().length(24).required(),
    }),
  },
};
