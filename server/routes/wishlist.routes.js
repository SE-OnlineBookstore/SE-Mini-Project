// FR-14: Wishlist (save for later, move to cart). Mounted at /api/v1/wishlist.
const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const s = require('../validators/wishlist.schema');
const c = require('../controllers/wishlistController');

router.use(verifyJWT);
router.use(authorizeRoles('BUYER'));

router.get('/', h(c.list));
router.get('/items', h(c.list));
router.post('/', validate(s.addWishlist), h(c.add));
router.post('/items', validate(s.addWishlist), h(c.add));
router.get('/check/:listingId', validate(s.checkWishlist), h(c.check));
router.delete('/:id', validate(s.wishlistParam), h(c.remove));
router.delete('/items/:id', validate(s.wishlistParam), h(c.remove));
router.post('/:id/move-to-cart', validate(s.wishlistParam), h(c.moveToCart));
router.post('/items/:id/move-to-cart', validate(s.wishlistParam), h(c.moveToCart));

module.exports = router;
