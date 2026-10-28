const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const schema = require('../validators/moderation.schema');
const controller = require('../controllers/moderationController');

router.use(verifyJWT);
router.use(authorizeRoles('ADMIN'));

router.patch('/:targetType/:id/block', validate(schema.block), h(controller.block));
router.patch('/:targetType/:id/unblock', validate(schema.unblock), h(controller.unblock));

module.exports = router;