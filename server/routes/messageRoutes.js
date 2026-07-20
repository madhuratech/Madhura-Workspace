const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getChannels,
  createChannel,
  getOrCreateDMChannel,
  getMessages,
  createMessage
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getChannels)
  .post(protect, createChannel);

router.route('/dm')
  .post(protect, getOrCreateDMChannel);

router.route('/:channelId/messages')
  .get(protect, getMessages)
  .post(protect, createMessage);

module.exports = router;
