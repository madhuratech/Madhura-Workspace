const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getAnnouncements)
  .post(protect, authorize('super_admin', 'hr'), createAnnouncement);

router.route('/:id')
  .delete(protect, authorize('super_admin', 'hr'), deleteAnnouncement);

module.exports = router;
