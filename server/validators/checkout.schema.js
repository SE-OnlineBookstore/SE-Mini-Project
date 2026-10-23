const Joi = require('joi');

module.exports = {
  checkout: {
    body: Joi.object({
      addressId: Joi.string().hex().length(24).required(),
      couponCode: Joi.string().trim().uppercase().max(20).allow('', null),
    }),
  },
  preview: {
    query: Joi.object({
      addressId: Joi.string().hex().length(24),
      couponCode: Joi.string().trim().uppercase().max(20).allow('', null),
    }),
  },
  validateCoupon: {
    body: Joi.object({
      code: Joi.string().trim().uppercase().max(20).required(),
    }),
  },
  orderId: {
    params: Joi.object({
      id: Joi.string().hex().length(24).required(),
    }),
  },
};
