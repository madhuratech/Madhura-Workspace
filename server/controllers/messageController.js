const Message = require('../models/Message');
const Channel = require('../models/Channel');
const { sendNotification } = require('./notificationController');

exports.getChannels = async (req, res) => {
  try {
    const channels = await Channel.find({ 
      workspace: req.params.workspaceId,
      $or: [
        { members: { $exists: false } },
        { members: { $size: 0 } },
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
      .sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createMessage = async (req, res) => {
  try {
    const message = await Message.create({
      text: req.body.text,
      channel: req.params.channelId,
      sender: req.user._id
    });
    const populatedMessage = await message.populate('sender', 'name email avatar');
    
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
