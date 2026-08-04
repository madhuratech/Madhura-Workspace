const express = require('express');
const router = express.Router();
const { getUsers, updatePresence, updateNotificationSettings, updateUserRole, changePassword, resetUserPassword } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getUsers);
router.route('/status').put(protect, updatePresence);
router.route('/notification-settings').put(protect, updateNotificationSettings);
router.route('/change-password').put(protect, changePassword);
router.route('/:id/role').put(protect, updateUserRole);
router.route('/:id/reset-password').put(protect, resetUserPassword);

module.exports = router;
