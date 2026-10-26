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

router.get('/', authorizeRoles('BUYER'), h(checkoutController.listOrders));
router.post('/', authorizeRoles('BUYER'), validate(checkoutSchema.checkout), h(checkoutController.checkout));
router.post('/checkout-summary', authorizeRoles('BUYER'), validate(orderSchema.checkoutSummary), h(orderController.checkoutSummary));
router.get('/:id', authorizeRoles('BUYER'), validate(checkoutSchema.orderId), h(checkoutController.getOrder));
router.get('/:id/invoice', authorizeRoles('BUYER', 'ADMIN'), validate(checkoutSchema.orderId), h(orderController.downloadInvoice));

module.exports = router;
