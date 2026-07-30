const Message = require('../models/Message');
const Channel = require('../models/Channel');
const { sendNotification } = require('./notificationController');

exports.getChannels = async (req, res) => {
  try {
    const channels = await Channel.find({ 
      workspace: req.params.workspaceId,
      $or: [
        { isPrivate: false },
        { members: req.user._id }
      ]
    });
    res.status(200).json(channels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createChannel = async (req, res) => {
  try {
    const channel = await Channel.create({
      name: req.body.name,
      description: req.body.description,
      workspace: req.params.workspaceId,
      isPrivate: req.body.isPrivate || false,
      members: req.body.members || []
    });
    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrCreateDMChannel = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user._id;
    
    // Sort IDs to ensure consistency
    const sortedIds = [currentUserId, targetUserId].sort();
    const dmName = `dm-${sortedIds[0]}-${sortedIds[1]}`;

    let channel = await Channel.findOne({ name: dmName, workspace: req.params.workspaceId });
    
    if (!channel) {
      channel = await Channel.create({
        name: dmName,
        description: 'Direct Message',
        workspace: req.params.workspaceId
      });
    }
    
    res.status(200).json(channel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ channel: req.params.channelId })
      .populate('sender', 'name email avatar')
      .populate('mentions', 'name')
      .sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createMessage = async (req, res) => {
  try {
    const { text, attachment, parentMessage, mentions } = req.body;

    if (!text && !attachment) {
      return res.status(400).json({ message: 'Please add message text or an attachment' });
    }

    const message = await Message.create({
      text: text || '',
      attachment,
      parentMessage: parentMessage || null,
      mentions: mentions || [],
      channel: req.params.channelId,
      sender: req.user._id
    });
    const populatedMessage = await message.populate([{ path: 'sender', select: 'name email avatar' }, { path: 'mentions', select: 'name' }]);
    
    // Emit via Socket.io
    if (req.io) {
      req.io.emit('new_message', populatedMessage);
    }
    
    // Create persistent notifications for channel members
    try {
      const channelObj = await Channel.findById(req.params.channelId);
      if (channelObj) {
        // If private channel, notify members. If public, we might not want to spam everyone, 
        // but for this specific request, we notify everyone in the workspace for public channels.
        let memberIdsToNotify = [];
        if (channelObj.members && channelObj.members.length > 0) {
          memberIdsToNotify = channelObj.members.filter(id => String(id) !== String(req.user._id));
        } else {
          // It's a public channel. Let's find all workspace members.
          const Workspace = require('../models/Workspace');
          const ws = await Workspace.findById(channelObj.workspace);
          if (ws && ws.members) {
            memberIdsToNotify = ws.members
              .filter(m => m.user && String(m.user) !== String(req.user._id))
              .map(m => m.user);
          }
        }
        
        for (const memberId of memberIdsToNotify) {
          await sendNotification(
            req,
            memberId,
            'chat',
            `New message in #${channelObj.name}`,
            `${req.user.name || 'User'}: ${req.body.text.substring(0, 30)}${req.body.text.length > 30 ? '...' : ''}`,
            '/chat'
          );
        }
      }
    } catch (notifErr) {
      console.error('Error sending chat notifications', notifErr);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to edit this message' });
    }
    
    message.text = req.body.text;
    message.isEdited = true;
    await message.save();
    
    const populatedMessage = await message.populate('sender', 'name email avatar');
    
    if (req.io) {
      req.io.emit('message_updated', populatedMessage);
    }
    
    res.status(200).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this message' });
    }
    
    await Message.findByIdAndDelete(req.params.messageId);
    
    if (req.io) {
      req.io.emit('message_deleted', { messageId: req.params.messageId, channelId: req.params.channelId });
    }
    
    res.status(200).json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markMessagesRead = async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // Find messages in the channel not sent by the user and where the user is not in readBy
    const result = await Message.updateMany(
      { 
        channel: channelId, 
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id }
      },
      { 
        $addToSet: { readBy: req.user._id } 
      }
    );
    
    if (result.modifiedCount > 0 && req.io) {
      req.io.emit('messages_read', { channelId, userId: req.user._id });
    }
    
    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUnreadCounts = async (req, res) => {
  try {
    const unreadMessages = await Message.aggregate([
      {
        $match: {
          sender: { $ne: req.user._id },
          readBy: { $ne: req.user._id }
        }
      },
      {
        $group: {
          _id: "$channel",
          count: { $sum: 1 }
        }
      }
    ]);

    // Populate channel details to get names
    const Channel = require('../models/Channel');
    await Channel.populate(unreadMessages, { path: '_id', select: 'name' });

    const unreadCounts = {};
    unreadMessages.forEach(item => {
      if (item._id) {
        // item._id is now the populated channel document
        unreadCounts[item._id._id.toString()] = item.count;
        if (item._id.name) {
          unreadCounts[item._id.name] = item.count;
        }
      }
    });

    res.status(200).json(unreadCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
