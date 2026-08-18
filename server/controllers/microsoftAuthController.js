const axios = require('axios');
const User = require('../models/User');
const qs = require('querystring');

const getMicrosoftConfig = () => {
  let backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  backendUrl = backendUrl.replace(/\/api\/auth\/microsoft\/callback\/?$/, '');
  backendUrl = backendUrl.replace(/\/$/, '');
  
  return {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri: `${backendUrl}/api/auth/microsoft/callback`,
    tenant: 'common' // Use 'common' for multi-tenant (personal and work accounts)
  };
};

// @desc    Get Microsoft OAuth URL
// @route   GET /api/auth/microsoft/url
// @access  Private
exports.getMicrosoftAuthUrl = (req, res) => {
  try {
    const config = getMicrosoftConfig();

    const authUrl = `https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/authorize?` + qs.stringify({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.redirectUri,
      response_mode: 'query',
      scope: 'offline_access user.read mail.read mail.send mail.readwrite',
      state: req.user._id.toString()
    });

    res.status(200).json({ url: authUrl });
  } catch (error) {
    console.error('Error generating Microsoft Auth URL:', error);
    res.status(500).json({ message: 'Error generating authentication URL' });
  }
};

// @desc    Handle Microsoft OAuth Callback
// @route   GET /api/auth/microsoft/callback
// @access  Public (Redirected from Microsoft)
exports.microsoftAuthCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
       console.error('Microsoft Auth Error:', error);
       return res.status(400).send(`Authorization failed. Error: ${error}`);
    }

    if (!code || !state) {
      return res.status(400).send('Authorization failed. Missing code or state.');
    }

    const userId = state;
    const config = getMicrosoftConfig();
    
    // Exchange code for tokens
    const tokenResponse = await axios.post(`https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/token`, qs.stringify({
      client_id: config.clientId,
      scope: 'offline_access user.read mail.read mail.send mail.readwrite',
      code: code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      client_secret: config.clientSecret
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const tokens = tokenResponse.data;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found.');
    }

    // Save tokens to user
    user.microsoftAccessToken = tokens.access_token;
    if (tokens.refresh_token) {
      user.microsoftRefreshToken = tokens.refresh_token;
    }
    // tokens.expires_in is in seconds
    user.microsoftTokenExpiry = Date.now() + (tokens.expires_in * 1000);
    user.activeEmailProvider = 'microsoft';
    
    await user.save();

    // Redirect back to frontend Email module
    const frontendUrl = process.env.FRONTEND_URL || 'https://workspace.madhuratech.com';
    res.redirect(`${frontendUrl}/email`);
  } catch (err) {
    console.error('Error in Microsoft Auth Callback:', err.response?.data || err.message);
    res.status(500).send('Authentication failed.');
  }
};

// @desc    Revoke Microsoft OAuth Access
// @route   DELETE /api/auth/microsoft/revoke
// @access  Private
exports.revokeMicrosoftAccess = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Clear tokens
    user.microsoftAccessToken = undefined;
    user.microsoftRefreshToken = undefined;
    user.microsoftTokenExpiry = undefined;
    
    if (user.activeEmailProvider === 'microsoft') {
        user.activeEmailProvider = 'none';
        // Fallback to google if it exists
        if (user.googleAccessToken) {
            user.activeEmailProvider = 'google';
        }
    }
    
    await user.save();
    
    res.status(200).json({ message: 'Microsoft access revoked successfully' });
  } catch (error) {
    console.error('Error revoking Microsoft access:', error);
    res.status(500).json({ message: 'Error revoking access' });
  }
};
