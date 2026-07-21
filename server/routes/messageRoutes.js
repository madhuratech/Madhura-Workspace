const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getChannels,
  createChannel,
  getOrCreateDMChannel,
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  markMessagesRead
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

router.route('/:channelId/messages/mark-read')
  .post(protect, markMessagesRead);

router.route('/:channelId/messages/:messageId')
  .put(protect, updateMessage)
  .delete(protect, deleteMessage);

module.exports = router;
