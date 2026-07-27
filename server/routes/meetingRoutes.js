const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  joinMeeting,
  endMeeting
} = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getMeetings).post(protect, createMeeting);
router.route('/:id').put(protect, updateMeeting).delete(protect, deleteMeeting);
router.route('/:id/join').post(protect, joinMeeting);
router.route('/:id/end').post(protect, endMeeting);

module.exports = router;
