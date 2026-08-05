const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const reminderController = require('../controllers/reminderController');

// @route   GET /api/reminders
// @desc    Get upcoming reminders (tasks and meetings)
// @access  Private
router.get('/', protect, reminderController.getUpcomingReminders);

module.exports = router;
