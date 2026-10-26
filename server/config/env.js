// Loads and validates configuration from the environment (SR-11: secrets never live in code).
require('dotenv').config({ quiet: true });
const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(5000),
  MONGO_URI: Joi.string().when('NODE_ENV', { is: 'test', then: Joi.optional(), otherwise: Joi.required() }),
  REDIS_URL: Joi.string().allow('').default(''),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  ACCESS_TOKEN_TTL_SEC: Joi.number().default(900), // 15 minutes (FR-03)
  REFRESH_TOKEN_TTL_DAYS: Joi.number().default(7), // 7 days (FR-03)
  CLIENT_ORIGIN: Joi.string().default('http://localhost:5173'),
  BCRYPT_COST: Joi.number().min(4).default(12), // 12 in every non-test environment (SR-01)
  SMTP_URL: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string().default('Online Bookstore <no-reply@bookstore.local>'),
  LOG_LEVEL: Joi.string().default('info'),
  COMMISSION_RATE: Joi.number().min(0).max(1).default(0.10),
}).unknown(true);

const { value, error } = schema.validate(process.env, { abortEarly: false });
if (error) {
  // Fail fast at start-up rather than at the first request.
  throw new Error(`Invalid environment configuration: ${error.message}`);
}
if (value.NODE_ENV === 'production' && value.BCRYPT_COST < 12) {
  throw new Error('BCRYPT_COST must be at least 12 in production (SR-01)');
}

module.exports = {
  env: value.NODE_ENV,
  isTest: value.NODE_ENV === 'test',
  isProd: value.NODE_ENV === 'production',
  port: value.PORT,
  mongoUri: value.MONGO_URI,
  redisUrl: value.REDIS_URL,
  jwt: {
    accessSecret: value.JWT_ACCESS_SECRET,
    accessTtlSec: value.ACCESS_TOKEN_TTL_SEC,
    refreshTtlDays: value.REFRESH_TOKEN_TTL_DAYS,
  },
  clientOrigin: value.CLIENT_ORIGIN,
  bcryptCost: value.BCRYPT_COST,
  smtpUrl: value.SMTP_URL,
  mailFrom: value.MAIL_FROM,
  logLevel: value.LOG_LEVEL,
  commissionRate: value.COMMISSION_RATE,
};
