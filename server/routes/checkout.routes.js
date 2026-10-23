// FR-15: Checkout with address and coupon. Mounted at /api/v1/checkout.
const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const s = require('../validators/checkout.schema');
const c = require('../controllers/checkoutController');

router.use(verifyJWT);
router.use(authorizeRoles('BUYER'));

router.get('/preview', validate(s.preview), h(c.preview));
router.post('/', validate(s.checkout), h(c.checkout));
router.post('/validate-coupon', validate(s.validateCoupon), h(c.validateCoupon));

module.exports = router;
