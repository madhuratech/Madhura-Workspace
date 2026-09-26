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

// Helper to decode Gmail base64 payload
const decodeBase64 = (encoded) => {
  if (!encoded) return '';
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
};

const extractBody = (payload) => {
  if (!payload) return '';
  if (payload.body && payload.body.data) {
    return decodeBase64(payload.body.data);
  }
  if (payload.parts && payload.parts.length > 0) {
    // Look for text/html first, then text/plain
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      return decodeBase64(htmlPart.body.data);
    }
    const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart && textPart.body && textPart.body.data) {
      return decodeBase64(textPart.body.data);
    }
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }
  return '';
};

// @desc    Get emails with search, pagination, and folder support
// @route   GET /api/workspaces/:workspaceId/emails
// @access  Private
exports.getEmails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+googleAccessToken +googleRefreshToken +googleTokenExpiry +microsoftAccessToken +microsoftRefreshToken +microsoftTokenExpiry');
    
    if (!user.activeEmailProvider || user.activeEmailProvider === 'none') {
      return res.status(401).json({ authRequired: true, message: 'Authentication required' });
    }

    const { folder = 'inbox', search = '', pageToken = '', maxResults = 20, skip = 0 } = req.query; 
    const limit = Math.min(Math.max(parseInt(maxResults) || 20, 1), 100);

    if (user.activeEmailProvider === 'google') {
      if (!user.googleAccessToken) return res.status(401).json({ authRequired: true, message: 'Google Authentication required' });
      
      let folderQuery = '';
      if (folder === 'inbox') folderQuery = 'in:inbox';
      else if (folder === 'sent') folderQuery = 'in:sent';
      else if (folder === 'drafts') folderQuery = 'is:draft';
      else if (folder === 'starred') folderQuery = 'is:starred';
      else if (folder === 'trash') folderQuery = 'in:trash';
      else if (folder === 'important') folderQuery = 'is:important';
      else if (folder === 'snoozed') folderQuery = 'is:snoozed';
      else if (folder === 'chats') folderQuery = 'is:chat';
      else if (folder === 'scheduled') folderQuery = 'is:scheduled';
      else if (folder === 'spam') folderQuery = 'in:spam';
      else if (folder === 'all') folderQuery = '';

      let q = [folderQuery, search.trim()].filter(Boolean).join(' ');

      const oauth2Client = getOAuth2Client(user);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const listParams = {
        userId: 'me',
        maxResults: limit,
      };
      if (q) listParams.q = q;
      if (pageToken) listParams.pageToken = pageToken;

      const response = await gmail.users.messages.list(listParams);
      if (!response.data.messages || response.data.messages.length === 0) {
        return res.status(200).json({
          emails: [],
          nextPageToken: null,
          resultSizeEstimate: 0
        });
      }

      const messages = await Promise.all(
        response.data.messages.map(async (msg) => {
          try {
            const msgData = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id,
              format: 'metadata',
              metadataHeaders: ['Subject', 'From', 'To', 'Date', 'Cc', 'Bcc']
            });
            const headers = msgData.data.payload?.headers || [];
            const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
            const labelIds = msgData.data.labelIds || [];

            return {
              _id: msg.id,
              threadId: msg.threadId,
              subject: getHeader('Subject'),
              from: getHeader('From'),
              to: getHeader('To'),
              date: getHeader('Date'),
              snippet: msgData.data.snippet || '',
              isRead: !labelIds.includes('UNREAD'),
              isStarred: labelIds.includes('STARRED'),
              isImportant: labelIds.includes('IMPORTANT'),
              isDraft: labelIds.includes('DRAFT'),
              labels: labelIds
            };
          } catch (itemErr) {
            console.error('Error fetching email item:', msg.id, itemErr.message);
            return null;
          }
        })
      );

      const validMessages = messages.filter(Boolean);

      return res.status(200).json({
        emails: validMessages,
        nextPageToken: response.data.nextPageToken || null,
        resultSizeEstimate: response.data.resultSizeEstimate || validMessages.length
      });

    } else if (user.activeEmailProvider === 'microsoft') {
      if (!user.microsoftAccessToken) return res.status(401).json({ authRequired: true, message: 'Microsoft Authentication required' });
      
      let msFolder = 'inbox';
      if (folder === 'sent') msFolder = 'sentitems';
      if (folder === 'drafts') msFolder = 'drafts';
      if (folder === 'trash') msFolder = 'deleteditems';
      if (folder === 'spam') msFolder = 'junkemail';
      
      let endpoint = `https://graph.microsoft.com/v1.0/me/mailFolders/${msFolder}/messages?$top=${limit}&$skip=${skip}&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,flag`;
      if (folder === 'all') {
         endpoint = `https://graph.microsoft.com/v1.0/me/messages?$top=${limit}&$skip=${skip}&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,flag`;
      }
      if (search.trim()) {
        endpoint += `&$search="${encodeURIComponent(search.trim())}"`;
      }
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${user.microsoftAccessToken}` }
      });

      const messages = (response.data.value || []).map(msg => ({
        _id: msg.id,
        threadId: msg.id,
        subject: msg.subject,
        from: msg.from?.emailAddress?.address ? `${msg.from.emailAddress.name} <${msg.from.emailAddress.address}>` : '',
        to: msg.toRecipients?.map(r => r.emailAddress.address).join(', ') || '',
        date: msg.receivedDateTime,
        snippet: msg.bodyPreview || '',
        isRead: msg.isRead,
        isStarred: msg.flag?.flagStatus === 'flagged',
        isImportant: false
      }));

      return res.status(200).json({
        emails: messages,
        nextPageToken: response.data['@odata.nextLink'] || null,
        resultSizeEstimate: messages.length
      });
    }
    
  } catch (error) {
    console.error('Email API Error:', error.response?.data || error.message);
    if (error.code === 401 || error.response?.status === 401) {
      return res.status(401).json({ authRequired: true, message: 'Authentication expired' });
    }
    res.status(500).json({ message: 'Error fetching emails' });
  }
};

// @desc    Get single email details
// @route   GET /api/workspaces/:workspaceId/emails/:id
// @access  Private
exports.getEmailById = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+googleAccessToken +googleRefreshToken +googleTokenExpiry +microsoftAccessToken');
    if (!user.activeEmailProvider || user.activeEmailProvider === 'none') {
      return res.status(401).json({ authRequired: true, message: 'Authentication required' });
    }

    const { id } = req.params;

    if (user.activeEmailProvider === 'google') {
      const oauth2Client = getOAuth2Client(user);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: id,
        format: 'full'
      });

      const headers = msgData.data.payload?.headers || [];
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      const labelIds = msgData.data.labelIds || [];
      const bodyContent = extractBody(msgData.data.payload);

      // Auto-mark as read in Google if unread
      if (labelIds.includes('UNREAD')) {
        gmail.users.messages.modify({
          userId: 'me',
          id: id,
          requestBody: { removeLabelIds: ['UNREAD'] }
        }).catch(err => console.error('Failed to mark as read', err.message));
      }

      return res.status(200).json({
        _id: id,
        threadId: msgData.data.threadId,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        cc: getHeader('Cc'),
        date: getHeader('Date'),
        snippet: msgData.data.snippet || '',
        body: bodyContent || msgData.data.snippet || '',
        isRead: true,
        isStarred: labelIds.includes('STARRED'),
        isImportant: labelIds.includes('IMPORTANT'),
        labels: labelIds
      });

    } else if (user.activeEmailProvider === 'microsoft') {
      const endpoint = `https://graph.microsoft.com/v1.0/me/messages/${id}`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${user.microsoftAccessToken}` }
      });
      const msg = response.data;
      return res.status(200).json({
        _id: msg.id,
        threadId: msg.id,
        subject: msg.subject,
        from: msg.from?.emailAddress?.address ? `${msg.from.emailAddress.name} <${msg.from.emailAddress.address}>` : '',
        to: msg.toRecipients?.map(r => r.emailAddress.address).join(', ') || '',
        date: msg.receivedDateTime,
        snippet: msg.bodyPreview || '',
        body: msg.body?.content || msg.bodyPreview || '',
        isRead: msg.isRead,
        isStarred: msg.flag?.flagStatus === 'flagged',
        isImportant: false
      });
    }

  } catch (error) {
    console.error('Get email error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch email details' });
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

    const { recipients, bcc, subject, body, isDraft } = req.body;
    if (isDraft) return res.status(501).json({ message: 'Drafts saving is in progress' });

    if (user.activeEmailProvider === 'google') {
      const oauth2Client = getOAuth2Client(user);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const makeEmail = (to, bccList, from, subj, message) => {
        const headers = [
          `To: ${to}`,
          ...(bccList && bccList.length ? [`Bcc: ${bccList.join(', ')}`] : []),
          `From: ${from}`,
          `Subject: =?utf-8?B?${Buffer.from(subj).toString('base64')}?=`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8',
          '',
          message,
        ];
        const str = headers.join('\n');
        return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };

      const rawMessage = makeEmail(
        Array.isArray(recipients) ? recipients.join(', ') : recipients,
        bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
        'me',
        subject || '',
        body || ''
      );

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
          toRecipients: (Array.isArray(recipients) ? recipients : [recipients]).map(r => ({ emailAddress: { address: r } }))
        },
        saveToSentItems: 'true'
      };

      await axios.post('https://graph.microsoft.com/v1.0/me/sendMail', emailPayload, {
        headers: { Authorization: `Bearer ${user.microsoftAccessToken}`, 'Content-Type': 'application/json' }
      });
      return res.status(201).json({ message: 'Email sent successfully' });
    }
  } catch (error) {
    console.error('Send error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to send email' });
  }
};

// @desc    Update email status (star, unstar, trash, archive, read, unread)
// @route   PUT /api/workspaces/:workspaceId/emails/:id/status
// @access  Private
exports.updateEmailStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+googleAccessToken +googleRefreshToken +googleTokenExpiry +microsoftAccessToken');
    if (!user.activeEmailProvider || user.activeEmailProvider === 'none') {
      return res.status(401).json({ authRequired: true });
    }

    const { id } = req.params;
    const { action } = req.body;

    if (user.activeEmailProvider === 'google') {
      const oauth2Client = getOAuth2Client(user);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      if (action === 'star') {
        await gmail.users.messages.modify({ userId: 'me', id, requestBody: { addLabelIds: ['STARRED'] } });
      } else if (action === 'unstar') {
        await gmail.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['STARRED'] } });
      } else if (action === 'trash') {
        await gmail.users.messages.trash({ userId: 'me', id });
      } else if (action === 'archive') {
        await gmail.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['INBOX'] } });
      } else if (action === 'mark_read') {
        await gmail.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['UNREAD'] } });
      } else if (action === 'mark_unread') {
        await gmail.users.messages.modify({ userId: 'me', id, requestBody: { addLabelIds: ['UNREAD'] } });
      }
      return res.status(200).json({ success: true, message: `Email ${action} succeeded` });

    } else if (user.activeEmailProvider === 'microsoft') {
      if (action === 'trash') {
        await axios.delete(`https://graph.microsoft.com/v1.0/me/messages/${id}`, {
          headers: { Authorization: `Bearer ${user.microsoftAccessToken}` }
        });
      } else if (action === 'mark_read') {
        await axios.patch(`https://graph.microsoft.com/v1.0/me/messages/${id}`, { isRead: true }, {
          headers: { Authorization: `Bearer ${user.microsoftAccessToken}` }
        });
      } else if (action === 'mark_unread') {
        await axios.patch(`https://graph.microsoft.com/v1.0/me/messages/${id}`, { isRead: false }, {
          headers: { Authorization: `Bearer ${user.microsoftAccessToken}` }
        });
      }
      return res.status(200).json({ success: true, message: `Email ${action} succeeded` });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Update email status error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to update email status' });
  }
};
