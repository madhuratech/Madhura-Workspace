const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  addChannelMembers,
  getOrCreateDMChannel,
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  markMessagesRead,
  getUnreadCounts,
  toggleReaction
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.route('/unread')
  .get(protect, getUnreadCounts);

router.route('/')
  .get(protect, getChannels)
  .post(protect, createChannel);

router.route('/dm')
  .post(protect, getOrCreateDMChannel);

router.route('/:channelId')
  .put(protect, updateChannel)
  .delete(protect, deleteChannel);

router.route('/:channelId/members')
  .post(protect, addChannelMembers);

router.route('/:channelId/messages')
  .get(protect, getMessages)
  .post(protect, createMessage);

router.route('/:channelId/messages/mark-read')
  .post(protect, markMessagesRead);

router.route('/:channelId/messages/:messageId')
  .put(protect, updateMessage)
  .delete(protect, deleteMessage);

router.post('/:channelId/messages/:messageId/react', protect, toggleReaction);

module.exports = router;
