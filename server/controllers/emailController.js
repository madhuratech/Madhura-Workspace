const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const getOAuth2Client = (user) => {
  let backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  backendUrl = backendUrl.replace(/\/api\/auth\/google\/callback\/?$/, '');
  backendUrl = backendUrl.replace(/\/$/, '');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${backendUrl}/api/auth/google/callback`
  );
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry
  });
  return oauth2Client;
};

// @desc    Get emails from Gmail API
// @route   GET /api/workspaces/:workspaceId/emails
// @access  Private
exports.getEmails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+googleAccessToken +googleRefreshToken +googleTokenExpiry');
    
    if (!user.googleAccessToken) {
      return res.status(401).json({ authRequired: true, message: 'Google Authentication required' });
    }

    const { folder = 'inbox' } = req.query; // inbox, sent, drafts, starred, trash
    
    let q = '';
    if (folder === 'inbox') q = 'in:inbox';
    if (folder === 'sent') q = 'in:sent';
    if (folder === 'drafts') q = 'is:draft';
    if (folder === 'starred') q = 'is:starred';
    if (folder === 'trash') q = 'in:trash';

    const oauth2Client = getOAuth2Client(user);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch message IDs
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: q,
      maxResults: 20
    });

    if (!response.data.messages) {
      return res.status(200).json([]);
    }

    // Fetch full messages
    const messages = await Promise.all(
      response.data.messages.map(async (msg) => {
        const msgData = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'To', 'Date']
        });

        const headers = msgData.data.payload.headers;
        const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

        return {
          _id: msg.id,
          threadId: msg.threadId,
          subject: getHeader('Subject'),
          from: getHeader('From'),
          to: getHeader('To'),
          date: getHeader('Date'),
          snippet: msgData.data.snippet,
          isRead: !msgData.data.labelIds.includes('UNREAD')
        };
      })
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error('Gmail API Error:', error);
    if (error.code === 401) {
      return res.status(401).json({ authRequired: true, message: 'Google Authentication expired' });
    }
    res.status(500).json({ message: 'Error fetching emails from Gmail' });
  }
};

// @desc    Send an email via Gmail API
// @route   POST /api/workspaces/:workspaceId/emails
// @access  Private
exports.sendEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+googleAccessToken +googleRefreshToken +googleTokenExpiry');
    
    if (!user.googleAccessToken) {
      return res.status(401).json({ authRequired: true, message: 'Google Authentication required' });
    }

    const { recipients, subject, body, isDraft } = req.body;
    
    if (isDraft) {
       // Draft saving logic (simplified or ignored for real Gmail api unless explicitly implementing drafts.create)
       return res.status(501).json({ message: 'Drafts not supported in current integration yet' });
    }

    const oauth2Client = getOAuth2Client(user);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const makeEmail = (to, from, subject, message) => {
      const str = [
        `To: ${to}`,
        `From: ${from}`,
        `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        message,
      ].join('\n');
      return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const rawMessage = makeEmail(
      recipients.join(', '),
      'me',
      subject || '',
      body || ''
    );

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage
      }
    });

    res.status(201).json({ message: 'Email sent successfully', result: result.data });
  } catch (error) {
    console.error('Gmail send error:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
};

// Stub for updates
exports.updateEmailStatus = async (req, res) => {
  res.status(200).json({ message: 'Status updated' });
};
