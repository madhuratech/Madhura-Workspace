const { google } = require('googleapis');
const axios = require('axios');
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

// @desc    Get emails
// @route   GET /api/workspaces/:workspaceId/emails
// @access  Private
exports.getEmails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+googleAccessToken +googleRefreshToken +googleTokenExpiry +microsoftAccessToken +microsoftRefreshToken +microsoftTokenExpiry');
    
    if (!user.activeEmailProvider || user.activeEmailProvider === 'none') {
      return res.status(401).json({ authRequired: true, message: 'Authentication required' });
    }

    const { folder = 'inbox' } = req.query; 
    
    if (user.activeEmailProvider === 'google') {
      if (!user.googleAccessToken) return res.status(401).json({ authRequired: true, message: 'Google Authentication required' });
      
      let q = '';
      if (folder === 'inbox') q = 'in:inbox';
      if (folder === 'sent') q = 'in:sent';
      if (folder === 'drafts') q = 'is:draft';
      if (folder === 'starred') q = 'is:starred';
      if (folder === 'trash') q = 'in:trash';
      if (folder === 'important') q = 'is:important';
      if (folder === 'snoozed') q = 'is:snoozed';
      if (folder === 'chats') q = 'is:chat';
      if (folder === 'spam') q = 'in:spam';

      const oauth2Client = getOAuth2Client(user);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const response = await gmail.users.messages.list({ userId: 'me', q: q, maxResults: 20 });
      if (!response.data.messages) return res.status(200).json([]);

      const messages = await Promise.all(
        response.data.messages.map(async (msg) => {
          const msgData = await gmail.users.messages.get({
            userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['Subject', 'From', 'To', 'Date']
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
      return res.status(200).json(messages);

    } else if (user.activeEmailProvider === 'microsoft') {
      if (!user.microsoftAccessToken) return res.status(401).json({ authRequired: true, message: 'Microsoft Authentication required' });
      
      let msFolder = 'inbox';
      if (folder === 'sent') msFolder = 'sentitems';
      if (folder === 'drafts') msFolder = 'drafts';
      if (folder === 'trash') msFolder = 'deleteditems';
      if (folder === 'spam') msFolder = 'junkemail';
      
      let endpoint = `https://graph.microsoft.com/v1.0/me/mailFolders/${msFolder}/messages?$top=20&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead`;
      if (folder === 'all') {
         endpoint = `https://graph.microsoft.com/v1.0/me/messages?$top=20&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead`;
      }
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${user.microsoftAccessToken}` }
      });

      const messages = response.data.value.map(msg => {
        return {
          _id: msg.id,
          threadId: msg.id,
          subject: msg.subject,
          from: msg.from?.emailAddress?.address ? `${msg.from.emailAddress.name} <${msg.from.emailAddress.address}>` : '',
          to: msg.toRecipients?.map(r => r.emailAddress.address).join(', ') || '',
          date: msg.receivedDateTime,
          snippet: msg.bodyPreview,
          isRead: msg.isRead
        };
      });

      return res.status(200).json(messages);
    }
    
  } catch (error) {
    console.error('Email API Error:', error.response?.data || error);
    if (error.code === 401 || error.response?.status === 401) {
      return res.status(401).json({ authRequired: true, message: 'Authentication expired' });
    }
    res.status(500).json({ message: 'Error fetching emails' });
  }
};

// @desc    Send an email
// @route   POST /api/workspaces/:workspaceId/emails
// @access  Private
exports.sendEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+googleAccessToken +googleRefreshToken +googleTokenExpiry +microsoftAccessToken');
    
    if (!user.activeEmailProvider || user.activeEmailProvider === 'none') {
      return res.status(401).json({ authRequired: true, message: 'Authentication required' });
    }

    const { recipients, subject, body, isDraft } = req.body;
    if (isDraft) return res.status(501).json({ message: 'Drafts not supported in current integration yet' });

    if (user.activeEmailProvider === 'google') {
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

      const rawMessage = makeEmail(recipients.join(', '), 'me', subject || '', body || '');
      const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } });
      return res.status(201).json({ message: 'Email sent successfully', result: result.data });

    } else if (user.activeEmailProvider === 'microsoft') {
      const emailPayload = {
        message: {
          subject: subject || '',
          body: {
            contentType: 'Text',
            content: body || ''
          },
          toRecipients: recipients.map(r => ({ emailAddress: { address: r } }))
        },
        saveToSentItems: 'true'
      };

      await axios.post('https://graph.microsoft.com/v1.0/me/sendMail', emailPayload, {
        headers: { Authorization: `Bearer ${user.microsoftAccessToken}`, 'Content-Type': 'application/json' }
      });
      return res.status(201).json({ message: 'Email sent successfully' });
    }
  } catch (error) {
    console.error('Send error:', error.response?.data || error);
    res.status(500).json({ message: 'Failed to send email' });
  }
};

// Stub for updates
exports.updateEmailStatus = async (req, res) => {
  res.status(200).json({ message: 'Status updated' });
};
