const { google } = require('googleapis');
const User = require('../models/User');

const getOAuth2Client = () => {
  let backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  backendUrl = backendUrl.replace(/\/api\/auth\/google\/callback\/?$/, '');
  backendUrl = backendUrl.replace(/\/$/, '');
  
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${backendUrl}/api/auth/google/callback`
  );
};

// @desc    Get Google OAuth URL
// @route   GET /api/auth/google/url
// @access  Private
exports.getGoogleAuthUrl = (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: req.user._id.toString() // Pass user ID in state to link accounts in callback
    });

    res.status(200).json({ url });
  } catch (error) {
    console.error('Error generating Google Auth URL:', error);
    res.status(500).json({ message: 'Error generating authentication URL' });
  }
};

// @desc    Handle Google OAuth Callback
// @route   GET /api/auth/google/callback
// @access  Public (Redirected from Google)
exports.googleAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).send('Authorization failed. Missing code or state.');
    }

    const userId = state; // The state contains the user ID
    
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found.');
    }

    // Save tokens to user
    user.googleAccessToken = tokens.access_token;
    if (tokens.refresh_token) {
      user.googleRefreshToken = tokens.refresh_token;
    }
    user.googleTokenExpiry = tokens.expiry_date;
    
    await user.save();

    // Redirect back to frontend Email module
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/email`);
  } catch (error) {
    console.error('Error in Google Auth Callback:', error);
    res.status(500).send('Authentication failed.');
  }
};

// @desc    Revoke Google OAuth Access
// @route   DELETE /api/auth/google/revoke
// @access  Private
exports.revokeGoogleAccess = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Clear tokens
    user.googleAccessToken = undefined;
    user.googleRefreshToken = undefined;
    user.googleTokenExpiry = undefined;
    
    await user.save();
    
    res.status(200).json({ message: 'Google access revoked successfully' });
  } catch (error) {
    console.error('Error revoking Google access:', error);
    res.status(500).json({ message: 'Error revoking access' });
  }
};
