const router = require('express').Router();
const h = require('../utils/asyncHandler');
const verifyJWT = require('../middleware/verifyJWT');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/analyticsController');

router.use(verifyJWT);
router.use(authorizeRoles('ADMIN'));

router.get('/export/csv', h(controller.exportCsv));
router.get('/export/pdf', h(controller.exportPdf));

module.exports = router;