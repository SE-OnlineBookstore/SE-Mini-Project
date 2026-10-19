// FR-16: Payment intent and signed webhook API. Mounted at /api/v1/payments.
const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const s = require('../validators/payment.schema');
const c = require('../controllers/paymentController');

// Buyer creates payment intent
router.post('/intent', verifyJWT, authorizeRoles('BUYER'), validate(s.intent), h(c.createIntent));

// Gateway webhook (signature checked in service)
router.post('/webhook', validate(s.webhook), h(c.webhook));

module.exports = router;
