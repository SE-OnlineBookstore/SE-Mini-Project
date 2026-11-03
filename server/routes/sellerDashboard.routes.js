const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/sellerDashboardController');
const orderController = require('../controllers/orderController');

router.use(verifyJWT);
router.use(authorizeRoles('SELLER'));

router.get('/dashboard', h(controller.getDashboard));

// S3-02: Retrieve order items for the logged-in seller.
router.get('/orders', h(orderController.getSellerOrders));

module.exports = router;
