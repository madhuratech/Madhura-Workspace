const express = require('express');
const router = express.Router();
const { getMicrosoftAuthUrl, microsoftAuthCallback, revokeMicrosoftAccess } = require('../controllers/microsoftAuthController');
const { protect } = require('../middleware/auth');

router.get('/url', protect, getMicrosoftAuthUrl);
router.get('/callback', microsoftAuthCallback);
router.delete('/revoke', protect, revokeMicrosoftAccess);

module.exports = router;
