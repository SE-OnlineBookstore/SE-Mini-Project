const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

module.exports = {
  intent: {
    body: Joi.object({
      orderId: objectId.required(),
    }),
  },
  webhook: {
    body: Joi.object({
      gatewayOrderId: Joi.string().required(),
      txnRef: Joi.string().required(),
      status: Joi.string().valid('SUCCESS', 'FAILED').required(),
      amount: Joi.number().integer().min(0),
      method: Joi.string().allow('', null),
    }).unknown(true),
  },
  simulate: {
    body: Joi.object({
      paymentId: objectId,
      orderId: objectId,
      status: Joi.string().valid('SUCCESS', 'FAILED').default('SUCCESS'),
      method: Joi.string().valid('UPI', 'CARD', 'NETBANKING', 'WALLET').default('UPI'),
    }).or('paymentId', 'orderId'),
  },
  orderId: {
    params: Joi.object({
      orderId: objectId.required(),
    }),
  },
};
