const Joi = require('joi');
const { CONDITIONS } = require('../models/Listing');

module.exports = {
  create: {
    body: Joi.object({
      isbn13: Joi.string().trim().required().pattern(/^\d{13}$/),
      condition: Joi.string().valid(...CONDITIONS).required(),
      price: Joi.number().integer().min(1).required(), // paise
      stock_qty: Joi.number().integer().min(0).required(),
    }),
  },
};
