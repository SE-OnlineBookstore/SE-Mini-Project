// FR-06 / Issue #19: seller listing creation.
const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const schema = require('../validators/listing.schema');
const controller = require('../controllers/listingController');

router.post(
  '/seller/listings',
  verifyJWT,
  authorizeRoles('SELLER'),
  validate(schema.create),
  h(controller.create),
);

module.exports = router;
