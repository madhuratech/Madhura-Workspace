const DM = require('../models/DM');
const DMMessage = require('../models/DMMessage');
const Workspace = require('../models/Workspace');
const { decryptText } = require('../utils/crypto');

// @desc    Get or create a DM thread between current user and another user
// @route   GET /api/workspaces/:workspaceId/dms/:otherUserId
// @access  Private
exports.getOrCreateDM = async (req, res) => {
  try {
    const { workspaceId, otherUserId } = req.params;
    const currentUserId = req.user.id;

    // Verify both are in workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    // Find existing DM with exactly these two participants
    let dm = await DM.findOne({
      workspace: workspaceId,
      participants: { $all: [currentUserId, otherUserId], $size: 2 }
    }).populate('participants', 'name email role');

    // If not exists, create one
    if (!dm) {
      dm = await DM.create({
        workspace: workspaceId,
        participants: [currentUserId, otherUserId]
      });
      dm = await dm.populate('participants', 'name email role');
    }

    res.status(200).json(dm);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get messages for a DM thread
// @route   GET /api/workspaces/:workspaceId/dms/:dmId/messages
// @access  Private
exports.getDMMessages = async (req, res) => {
  try {
    const { dmId } = req.params;
    
    // Check if user is in this DM
    const dm = await DM.findById(dmId);
    if (!dm) return res.status(404).json({ message: 'DM not found' });
    if (!dm.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized for this DM' });
    }

    const messages = await DMMessage.find({ dm: dmId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })
      .lean();

    const formattedMessages = messages.map(msg => ({
      ...msg,
      text: decryptText(msg.text)
    }));

    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Send a DM message
// @route   POST /api/workspaces/:workspaceId/dms/:dmId/messages
// @access  Private
exports.sendDMMessage = async (req, res) => {
  try {
    const { dmId } = req.params;
    const { text, attachment } = req.body;

    const dm = await DM.findById(dmId);
    if (!dm) return res.status(404).json({ message: 'DM not found' });
    if (!dm.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let message = await DMMessage.create({
      dm: dmId,
      sender: req.user.id,
      text,
      attachment
    });

    message = await message.populate('sender', 'name email');

    if (req.io && req.onlineUsers) {
      dm.participants.forEach(pId => {
        const pIdStr = pId.toString();
        if (req.onlineUsers.has(pIdStr)) {
          req.onlineUsers.get(pIdStr).forEach(socketId => {
            req.io.to(socketId).emit('new_message', message);
          });
        }
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.markDMMessagesRead = async (req, res) => {
  try {
    const { dmId } = req.params;
    const dm = await DM.findById(dmId);
    
    const result = await DMMessage.updateMany(
      { 
        dm: dmId, 
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id }
      },
      { 
        $addToSet: { readBy: req.user._id } 
      }
    );
    
    if (result.modifiedCount > 0 && req.io && req.onlineUsers && dm) {
      dm.participants.forEach(pId => {
        const pIdStr = pId.toString();
        if (req.onlineUsers.has(pIdStr)) {
          req.onlineUsers.get(pIdStr).forEach(socketId => {
            req.io.to(socketId).emit('dm_messages_read', { dmId, userId: req.user._id });
          });
        }
      });
    }
    
    res.status(200).json({ message: 'DM Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateDMMessage = async (req, res) => {
  try {
    const message = await DMMessage.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to edit this message' });
    }
    
    // Check if message is older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.createdAt < fiveMinutesAgo) {
      return res.status(403).json({ message: 'Messages can only be edited within 5 minutes of sending' });
    }
    
    message.text = req.body.text;
    message.isEdited = true;
    await message.save();
    
    const populatedMessage = await message.populate('sender', 'name email avatar');
    
    if (req.io && req.onlineUsers) {
      const dm = await DM.findById(message.dm);
      if (dm) {
        dm.participants.forEach(pId => {
          const pIdStr = pId.toString();
          if (req.onlineUsers.has(pIdStr)) {
            req.onlineUsers.get(pIdStr).forEach(socketId => {
              req.io.to(socketId).emit('message_updated', populatedMessage);
            });
          }
        });
      }
    }
    
    res.status(200).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDMMessage = async (req, res) => {
  try {
    const message = await DMMessage.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this message' });
    }
    
    message.isDeleted = true;
    message.text = '';
    message.attachment = undefined;
    await message.save();
    
    const populatedMessage = await message.populate('sender', 'name email avatar');
    
    if (req.io && req.onlineUsers) {
      const dm = await DM.findById(message.dm);
      if (dm) {
        dm.participants.forEach(pId => {
          const pIdStr = pId.toString();
          if (req.onlineUsers.has(pIdStr)) {
            req.onlineUsers.get(pIdStr).forEach(socketId => {
              req.io.to(socketId).emit('message_updated', Object.assign(populatedMessage.toObject(), { dm: req.params.dmId }));
            });
          }
        });
      }
    }
    
    res.status(200).json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recent DM activity timestamps for sorting
// @route   GET /api/workspaces/:workspaceId/dms/activity/recent
// @access  Private
exports.getRecentDMActivity = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const currentUserId = req.user._id || req.user.id;

    // Find all DMs in this workspace where the user is a participant
    const dms = await DM.find({
      workspace: workspaceId,
      participants: currentUserId
    }).lean();

    if (!dms || dms.length === 0) {
      return res.status(200).json({});
    }

    const dmMap = new Map(); // dmId string -> otherUserId string
    const dmIds = [];

    dms.forEach(d => {
      dmIds.push(d._id);
      const otherParticipant = d.participants.find(p => String(p) !== String(currentUserId));
      if (otherParticipant) {
        dmMap.set(String(d._id), String(otherParticipant));
      }
    });

    const recentMsgs = await DMMessage.aggregate([
      { $match: { dm: { $in: dmIds }, isDeleted: { $ne: true } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$dm',
          lastActive: { $first: '$createdAt' }
        }
      }
    ]);

    const activityMap = {};
    recentMsgs.forEach(item => {
      const otherUserId = dmMap.get(String(item._id));
      if (otherUserId && item.lastActive) {
        activityMap[otherUserId] = new Date(item.lastActive).getTime();
      }
    });

    res.status(200).json(activityMap);
  } catch (error) {
    console.error('Error fetching recent DM activity:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle DM message reaction
// @route   POST /api/workspaces/:workspaceId/dms/:dmId/messages/:messageId/react
// @access  Private
exports.toggleDMReaction = async (req, res) => {
  try {
    const { dmId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id || req.user.id;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const message = await DMMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (!message.reactions) {
      message.reactions = [];
    }

    // Check if user already reacted with this exact emoji
    const existingSameEmoji = message.reactions.some(
      r => r.emoji === emoji && r.users.some(u => String(u) === String(userId))
    );

    // Remove user from ALL reaction emojis on this message (single reaction per user like WhatsApp)
    message.reactions.forEach(r => {
      r.users = r.users.filter(u => String(u) !== String(userId));
    });

    // If user hadn't already reacted with this emoji, add the user (replaces previous emoji)
    if (!existingSameEmoji) {
      const targetReaction = message.reactions.find(r => r.emoji === emoji);
      if (targetReaction) {
        targetReaction.users.push(userId);
      } else {
        message.reactions.push({
          emoji,
          users: [userId]
        });
      }
    }

    // Prune reactions that have 0 users
    message.reactions = message.reactions.filter(r => r.users && r.users.length > 0);

    await message.save();

    const payload = {
      dmId,
      messageId: message._id,
      reactions: message.reactions
    };

    if (req.io && req.onlineUsers) {
      const dm = await DM.findById(dmId);
      if (dm) {
        dm.participants.forEach(pId => {
          const pIdStr = pId.toString();
          if (req.onlineUsers.has(pIdStr)) {
            req.onlineUsers.get(pIdStr).forEach(socketId => {
              req.io.to(socketId).emit('message_reaction', payload);
            });
          }
        });
      }
    }

    res.status(200).json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};


