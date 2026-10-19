// FR-15: Checkout and order API. Mounted at /api/v1/orders.
const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const s = require('../validators/order.schema');
const c = require('../controllers/orderController');

router.use(verifyJWT);
router.use(authorizeRoles('BUYER'));

router.post('/checkout-summary', validate(s.checkoutSummary), h(c.checkoutSummary));
router.post('/', validate(s.createOrder), h(c.createOrder));
router.get('/', h(c.listOrders));
router.get('/:id', validate(s.orderId), h(c.getOrder));

module.exports = router;
