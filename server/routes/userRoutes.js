const express = require('express');
const router = express.Router();
const { getUsers, updatePresence, updateNotificationSettings, updateUserRole } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getUsers);
router.route('/status').put(protect, updatePresence);
router.route('/notification-settings').put(protect, updateNotificationSettings);
router.route('/:id/role').put(protect, updateUserRole);

module.exports = router;
