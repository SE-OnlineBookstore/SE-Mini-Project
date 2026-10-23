const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const orderSchema = require('../validators/order.schema');
const controller = require('../controllers/fulfilmentController');

router.use(verifyJWT);
router.use(authorizeRoles('SELLER'));

router.post(
  '/:itemId/accept',
  validate(orderSchema.fulfilmentItemId),
  h(controller.accept)
);

router.post(
  '/:itemId/pack',
  validate(orderSchema.fulfilmentItemId),
  h(controller.pack)
);

router.post(
  '/:itemId/dispatch',
  validate(orderSchema.dispatch),
  h(controller.dispatch)
);

module.exports = router;
