const express = require('express');
const router = express.Router();
const {
  getUsers,
  updatePresence,
  updateNotificationSettings,
  updateUserRole,
  changePassword,
  resetUserPassword,
  getUserById,
  updateAvatar,
  updatePushToken,
  muteNotifications
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getUsers);
router.route('/status').put(protect, updatePresence);
router.route('/notification-settings').put(protect, updateNotificationSettings);
router.route('/push-token').put(protect, updatePushToken);
router.route('/mute-notifications').put(protect, muteNotifications);
router.route('/change-password').put(protect, changePassword);
router.route('/avatar').put(protect, updateAvatar);
router.route('/:id').get(protect, getUserById);
router.route('/:id/role').put(protect, updateUserRole);
router.route('/:id/reset-password').put(protect, resetUserPassword);

module.exports = router;
