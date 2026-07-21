const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const {
  getOrCreateDM,
  getDMMessages,
  sendDMMessage
} = require('../controllers/dmController');

router.use(protect);

router.get('/:otherUserId', getOrCreateDM);
router.route('/:dmId/messages')
  .get(getDMMessages)
  .post(sendDMMessage);

module.exports = router;
