const express = require('express');
const router = express.Router();
const { inviteUser, validateToken, acceptInvitation } = require('../controllers/invitationController');
const { protect } = require('../middleware/auth');

router.post('/', protect, inviteUser);
router.get('/validate/:token', validateToken);
router.post('/accept', acceptInvitation);

module.exports = router;
