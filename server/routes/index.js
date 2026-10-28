const router = require('express').Router();

router.use(require('./health.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use(require('./book.routes'));
router.use(require('./review.routes'));
router.use(require('./listing.routes'));

router.use('/cart', require('./cart.routes'));
router.use('/wishlist', require('./wishlist.routes'));
router.use('/checkout', require('./checkout.routes'));
router.use('/orders', require('./order.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/seller/fulfilment', require('./fulfilment.routes'));
router.use('/seller', require('./sellerDashboard.routes'));
router.use('/admin/analytics', require('./analytics.routes'));

// Sprint 2: cart, wishlist, order, payment routes; seller routes.
// Sprint 3: admin routes, reviews.
module.exports = router;