// Orders and Checkout. Mounted at /api/v1/orders.
const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const checkoutSchema = require('../validators/checkout.schema');
const checkoutController = require('../controllers/checkoutController');
const orderSchema = require('../validators/order.schema');
const orderController = require('../controllers/orderController');

router.use(verifyJWT);
router.use(authorizeRoles('BUYER'));

router.get('/', h(checkoutController.listOrders));
router.post('/', validate(checkoutSchema.checkout), h(checkoutController.checkout));
router.post('/checkout-summary', validate(orderSchema.checkoutSummary), h(orderController.checkoutSummary));
router.get('/:id', validate(checkoutSchema.orderId), h(checkoutController.getOrder));

module.exports = router;
