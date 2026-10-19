// FR-13: Shopping cart API. Mounted at /api/v1/cart.
const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const s = require('../validators/cart.schema');
const c = require('../controllers/cartController');

router.use(verifyJWT);
router.use(authorizeRoles('BUYER'));

router.get('/', h(c.getCart));
router.post('/items', validate(s.addItem), h(c.addItem));
router.patch('/items/:id', validate(s.updateItem), h(c.updateItem));
router.delete('/items/:id', validate(s.itemId), h(c.removeItem));
router.delete('/', h(c.clearCart));

module.exports = router;
