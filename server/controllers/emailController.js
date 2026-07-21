const Email = require('../models/Email');
const Workspace = require('../models/Workspace');
const { sendNotification } = require('./notificationController');

// @desc    Get emails for a user
// @route   GET /api/workspaces/:workspaceId/emails
// @access  Private
const getEmails = async (req, res) => {
  try {
    const { folder } = req.query; // 'inbox', 'sent', 'drafts', 'starred', 'trash'
    
    let query = { workspace: req.params.workspaceId };

    if (folder === 'sent') {
      query.sender = req.user._id;
      query.isDraft = false;
      query.trashBy = { $ne: req.user._id };
    } else if (folder === 'drafts') {
      query.sender = req.user._id;
      query.isDraft = true;
      query.trashBy = { $ne: req.user._id };
    } else if (folder === 'starred') {
      query.starredBy = req.user._id;
      query.trashBy = { $ne: req.user._id };
    } else if (folder === 'trash') {
      query.trashBy = req.user._id;
    } else {
      // Default to Inbox
      query.$or = [
        { recipients: req.user._id },
        { bcc: req.user._id }
      ];
      query.isDraft = false;
      query.trashBy = { $ne: req.user._id };
    }

    const emails = await Email.find(query)
      .populate('sender', 'name email avatar role')
      .populate('recipients', 'name email avatar role')
      .populate('bcc', 'name email avatar role')
      .sort({ createdAt: -1 });

    res.status(200).json(emails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send or Draft an email
// @route   POST /api/workspaces/:workspaceId/emails
// @access  Private
const createEmail = async (req, res) => {
  try {
    const { recipients, bcc, subject, message, isDraft } = req.body;

    const email = await Email.create({
      workspace: req.params.workspaceId,
      sender: req.user._id,
      recipients: recipients || [],
      bcc: bcc || [],
      subject,
      message,
      isDraft: isDraft || false,
      readBy: isDraft ? [] : [req.user._id] // Sender has implicitly read their own email
    });

    const populatedEmail = await Email.findById(email._id)
      .populate('sender', 'name email avatar')
      .populate('recipients', 'name email avatar')
      .populate('bcc', 'name email avatar');

    // Notify recipients if not a draft
    if (!isDraft) {
      const allRecipients = [...(recipients || []), ...(bcc || [])];
      
      allRecipients.forEach(recipientId => {
        sendNotification(
          req,
          recipientId,
          'general',
          'New Email',
          `You received a new email from ${req.user.name}: ${subject || '(No Subject)'}`,
          `/email`
        );
      });
      
      if (req.io) {
        req.io.emit('emailSent', populatedEmail);
      }
    }

    res.status(201).json(populatedEmail);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update email status (read, star, trash)
// @route   PUT /api/workspaces/:workspaceId/emails/:id/status
// @access  Private
const updateEmailStatus = async (req, res) => {
  try {
    const { action } = req.body; // 'read', 'unread', 'star', 'unstar', 'trash', 'untrash'
    
    const email = await Email.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Email not found' });

    if (action === 'read') {
      if (!email.readBy.includes(req.user._id)) email.readBy.push(req.user._id);
    } else if (action === 'unread') {
      email.readBy = email.readBy.filter(id => id.toString() !== req.user._id.toString());
    } else if (action === 'star') {
      if (!email.starredBy.includes(req.user._id)) email.starredBy.push(req.user._id);
    } else if (action === 'unstar') {
      email.starredBy = email.starredBy.filter(id => id.toString() !== req.user._id.toString());
    } else if (action === 'trash') {
      if (!email.trashBy.includes(req.user._id)) email.trashBy.push(req.user._id);
    } else if (action === 'untrash') {
      email.trashBy = email.trashBy.filter(id => id.toString() !== req.user._id.toString());
    }

    await email.save();
    res.status(200).json(email);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getEmails,
  createEmail,
  updateEmailStatus
};
