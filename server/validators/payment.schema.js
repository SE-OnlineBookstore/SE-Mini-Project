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
};
