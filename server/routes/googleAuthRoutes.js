const express = require('express');
const router = express.Router();
const { getGoogleAuthUrl, googleAuthCallback } = require('../controllers/googleAuthController');
const { protect } = require('../middleware/auth');

router.get('/url', protect, getGoogleAuthUrl);
router.get('/callback', googleAuthCallback);

module.exports = router;
