// FR-11. Mounted at /api/v1.
const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const s = require('../validators/review.schema');
const c = require('../controllers/reviewController');

router.post('/books/:id/reviews', verifyJWT, authorizeRoles('BUYER'), validate(s.create), h(c.create));

module.exports = router;
