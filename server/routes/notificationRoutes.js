const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
  deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getNotifications);
router.route('/read-all').put(protect, markAllAsRead);
router.route('/delete-all').delete(protect, deleteAllNotifications);
router.route('/:id').delete(protect, deleteNotification);
router.route('/:id/read').put(protect, markAsRead);

module.exports = router;
