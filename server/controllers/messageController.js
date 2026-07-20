const Message = require('../models/Message');
const Channel = require('../models/Channel');

exports.getChannels = async (req, res) => {
  try {
    const channels = await Channel.find({ workspace: req.params.workspaceId });
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
      workspace: req.params.workspaceId
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
