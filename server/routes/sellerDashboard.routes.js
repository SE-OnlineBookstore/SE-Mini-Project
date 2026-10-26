const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/sellerDashboardController');

router.use(verifyJWT);
router.use(authorizeRoles('SELLER'));

router.get('/dashboard', h(controller.getDashboard));

module.exports = router;
