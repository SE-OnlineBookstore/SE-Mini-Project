// Orders. Mounted at /api/v1/orders (SAD Table 4.3).
const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const s = require('../validators/checkout.schema');
const c = require('../controllers/checkoutController');

router.use(verifyJWT);
router.use(authorizeRoles('BUYER'));

router.get('/', h(c.listOrders));
router.post('/', validate(s.checkout), h(c.checkout));
router.get('/:id', validate(s.orderId), h(c.getOrder));

module.exports = router;
