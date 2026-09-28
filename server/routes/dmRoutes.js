const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const {
  getOrCreateDM,
  getDMMessages,
  sendDMMessage,
  markDMMessagesRead,
  updateDMMessage,
  deleteDMMessage,
  getRecentDMActivity
} = require('../controllers/dmController');

router.use(protect);

router.get('/activity/recent', getRecentDMActivity);
router.get('/:otherUserId', getOrCreateDM);
router.route('/:dmId/messages')
  .get(getDMMessages)
  .post(sendDMMessage);

router.post('/:dmId/messages/mark-read', markDMMessagesRead);

router.route('/:dmId/messages/:messageId')
  .put(updateDMMessage)
  .delete(deleteDMMessage);

module.exports = router;
