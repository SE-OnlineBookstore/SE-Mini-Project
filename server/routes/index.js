const router = require('express').Router();

router.use(require('./health.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use(require('./book.routes'));
router.use('/wishlist', require('./wishlist.routes'));
router.use('/checkout', require('./checkout.routes'));
router.use('/orders', require('./order.routes'));
router.use('/payments', require('./payment.routes'));
// Sprint 2: seller routes (Hardhick M Gowda).
// Sprint 3: admin routes, reviews.

module.exports = router;
