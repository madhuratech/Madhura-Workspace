const express = require('express');
const router = express.Router();
const { getGoogleAuthUrl, googleAuthCallback, revokeGoogleAccess } = require('../controllers/googleAuthController');
const { protect } = require('../middleware/auth');

router.get('/url', protect, getGoogleAuthUrl);
router.get('/callback', googleAuthCallback);
router.delete('/revoke', protect, revokeGoogleAccess);

module.exports = router;
