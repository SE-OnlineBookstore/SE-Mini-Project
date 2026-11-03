
// FR-06 / Issue #19: seller listing creation.
// Issue #20: seller listing price and stock management.
// S3-01: seller listing retrieval.

const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const schema = require('../validators/listing.schema');
const controller = require('../controllers/listingController');

// S3-01: Get all listings belonging to the logged-in seller.
router.get(
  '/seller/listings',
  verifyJWT,
  authorizeRoles('SELLER'),
  h(controller.list),
);

router.post(
  '/seller/listings',
  verifyJWT,
  authorizeRoles('SELLER'),
  validate(schema.create),
  h(controller.create),
);

router.patch(
  '/seller/listings/:id',
  verifyJWT,
  authorizeRoles('SELLER'),
  validate(schema.update),
  h(controller.update),
);

module.exports = router;
