const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getEmails,
  createEmail,
  updateEmailStatus
} = require('../controllers/emailController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getEmails).post(protect, createEmail);
router.route('/:id/status').put(protect, updateEmailStatus);

module.exports = router;
