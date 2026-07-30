const express = require('express');
const router = express.Router({ mergeParams: true });
const { getAuditLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getAuditLogs);

module.exports = router;
