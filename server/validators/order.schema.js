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

  orderAction: {
    params: Joi.object({ id: objectId.required() }),
    body: Joi.object({
      reason: Joi.string().trim().max(500).allow('', null),
    }).default({}),
  },

  fulfilmentItemId: {
    params: Joi.object({ itemId: objectId.required() }),
  },

  dispatch: {
    params: Joi.object({ itemId: objectId.required() }),
    body: Joi.object({
      courier: Joi.string().trim().min(1).max(60).required(),
      trackingNo: Joi.string().trim().min(1).max(40).required(),
    }),
  },
};
