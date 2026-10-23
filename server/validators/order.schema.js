const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

module.exports = {
  checkoutSummary: {
    body: Joi.object({
      addressId: objectId.allow(null),
      couponCode: Joi.string().trim().uppercase().max(20).allow('', null),
    }),
  },
  createOrder: {
    body: Joi.object({
      addressId: objectId.required(),
      couponCode: Joi.string().trim().uppercase().max(20).allow('', null),
    }),
  },
  orderId: {
    params: Joi.object({ id: objectId.required() }),
  },
};
