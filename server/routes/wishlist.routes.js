// FR-14: Wishlist API. Mounted at /api/v1/wishlist.
const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const s = require('../validators/wishlist.schema');
const c = require('../controllers/wishlistController');

router.use(verifyJWT);
router.use(authorizeRoles('BUYER'));

router.get('/', h(c.getWishlist));
router.post('/items', validate(s.addItem), h(c.addItem));
router.delete('/items/:id', validate(s.itemId), h(c.removeItem));
router.post('/items/:id/move-to-cart', validate(s.itemId), h(c.moveToCart));

module.exports = router;
