const Message = require('../models/Message');
const Channel = require('../models/Channel');
const { sendNotification } = require('./notificationController');
const { decryptText } = require('../utils/crypto');

exports.getChannels = async (req, res) => {
  try {
    const isSuperAdminOrHr = ['super_admin', 'hr'].includes(req.user.role);
    
    // Super Admin & HR can see all channels in the workspace.
    // Other members can see all Public Channels (isPrivate is false/null/undefined)
    // plus any Private Channels they are a member of.
    const query = { 
      workspace: req.params.workspaceId
    };

    if (!isSuperAdminOrHr) {
      query.$or = [
        { isPrivate: { $ne: true } },
        { members: req.user._id }
      ];
    }

    const channels = await Channel.find(query)
      .populate('createdBy', 'name email avatar role')
      .populate('members', 'name email avatar role designation')
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json(channels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createChannel = async (req, res) => {
  try {
    const Workspace = require('../models/Workspace');
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isPrivate = Boolean(req.body.isPrivate);
    const isSuperAdminOrHr = ['super_admin', 'hr'].includes(req.user.role);

    // Rule: Only Super Admin (MD) and HR can create Public Groups/Channels
    if (!isPrivate && !isSuperAdminOrHr) {
      return res.status(403).json({ message: 'Only Super Admin (MD) and HR can create public groups' });
    }

    // Role check: Only super_admin, hr, or team_leader can create channels
    const allowedRoles = ['super_admin', 'hr', 'team_leader'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to create channels' });
    }

    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ message: 'Channel name is required' });
    }

    const formattedName = req.body.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    if (!formattedName) {
      return res.status(400).json({ message: 'Please enter a valid channel name' });
    }

    // Check if channel with same name exists in workspace
    const existingChannel = await Channel.findOne({
      workspace: req.params.workspaceId,
      name: formattedName
    });
    if (existingChannel) {
      return res.status(400).json({ message: `A channel or group named #${formattedName} already exists in this workspace` });
    }

    let members = [];
    if (isPrivate) {
      // Private channel: explicitly specified members + creator
      members = (req.body.members || []).map(m => (m && m._id ? m._id : m));
      if (!members.some(m => m.toString() === req.user._id.toString())) {
        members.push(req.user._id);
      }
    } else {
      // Public channel: automatically include all members of the workspace
      if (workspace.members && workspace.members.length > 0) {
        members = workspace.members.map(m => (m.user ? m.user.toString() : null)).filter(Boolean);
      }
      if (workspace.owner && !members.some(m => m.toString() === workspace.owner.toString())) {
        members.push(workspace.owner.toString());
      }
      if (!members.some(m => m.toString() === req.user._id.toString())) {
        members.push(req.user._id.toString());
      }
    }

    const channel = await Channel.create({
      name: formattedName,
      description: req.body.description || '',
      workspace: req.params.workspaceId,
      isPrivate: isPrivate,
      createdBy: req.user._id,
      members: members
    });

    const populatedChannel = await Channel.findById(channel._id)
      .populate('createdBy', 'name email avatar role')
      .populate('members', 'name email avatar role designation')
      .lean();

    if (req.io) {
      req.io.emit('channel_created', populatedChannel);
    }
    res.status(201).json(populatedChannel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateChannel = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    const isCreator = channel.createdBy && channel.createdBy.toString() === req.user._id.toString();
    const isAuthorized = isCreator || ['super_admin', 'hr'].includes(req.user.role);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Only the channel creator, HR or Admin can edit this channel' });
    }

    if (req.body.name) {
      channel.name = req.body.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    }
    if (req.body.description !== undefined) channel.description = req.body.description;
    
    if (req.body.isPrivate !== undefined) {
      const willBePrivate = Boolean(req.body.isPrivate);
      // Changing from private to public requires Super Admin or HR
      if (!willBePrivate && !['super_admin', 'hr'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Only Super Admin and HR can make a group public' });
      }
      channel.isPrivate = willBePrivate;
      if (!willBePrivate) {
        // When making public, auto-include all workspace members
        const Workspace = require('../models/Workspace');
        const ws = await Workspace.findById(channel.workspace);
        if (ws && ws.members) {
          ws.members.forEach(m => {
            if (m.user && !channel.members.some(id => id.toString() === m.user.toString())) {
              channel.members.push(m.user);
            }
          });
        }
      }
    }

    if (req.body.members && Array.isArray(req.body.members)) {
      let members = req.body.members.map(m => (m && m._id ? m._id : m));
      if (channel.createdBy && !members.some(m => m.toString() === channel.createdBy.toString())) {
        members.push(channel.createdBy);
      }
      channel.members = members;
    }

    await channel.save();
    
    const populatedChannel = await Channel.findById(channel._id)
      .populate('createdBy', 'name email avatar role')
      .populate('members', 'name email avatar role designation')
      .lean();

    if (req.io) {
      req.io.emit('channel_updated', populatedChannel);
    }
    res.status(200).json(populatedChannel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteChannel = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    const isCreator = channel.createdBy && channel.createdBy.toString() === req.user._id.toString();
    const isAuthorized = isCreator || ['super_admin', 'hr'].includes(req.user.role);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Only the channel creator, HR or Admin can delete this channel' });
    }

    await Message.deleteMany({ channel: channel._id });
    await Channel.findByIdAndDelete(channel._id);

    if (req.io) {
      req.io.emit('channel_deleted', { channelId: channel._id });
    }

    res.status(200).json({ message: 'Channel deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addChannelMembers = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    const isCreator = channel.createdBy && channel.createdBy.toString() === req.user._id.toString();
    const isAuthorized = isCreator || ['super_admin', 'hr'].includes(req.user.role);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Only the channel creator, HR or Admin can add members' });
    }

    const { memberIds } = req.body;
    if (memberIds && Array.isArray(memberIds)) {
      memberIds.forEach(id => {
        if (!channel.members.some(m => m.toString() === id.toString())) {
          channel.members.push(id);
        }
      });
      await channel.save();
    }

    const populatedChannel = await Channel.findById(channel._id)
      .populate('createdBy', 'name email avatar role')
      .populate('members', 'name email avatar role designation')
      .lean();

    if (req.io) {
      req.io.emit('channel_updated', populatedChannel);
    }

    res.status(200).json(populatedChannel);
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
      .sort({ createdAt: 1 })
      .lean();

    const formattedMessages = messages.map(msg => ({
      ...msg,
      text: decryptText(msg.text)
    }));

    res.status(200).json(formattedMessages);
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
        // If private channel, notify only channel members. If public, notify all workspace members.
        let memberIdsToNotify = [];
        if (channelObj.isPrivate) {
          memberIdsToNotify = (channelObj.members || []).filter(id => String(id) !== String(req.user._id));
        } else {
          // It's a public channel. Notify all workspace members.
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
    
    // Check if message is older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.createdAt < fiveMinutesAgo) {
      return res.status(403).json({ message: 'Messages can only be edited within 5 minutes of sending' });
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
    
    message.isDeleted = true;
    message.text = '';
    message.attachment = undefined;
    await message.save();
    
    const populatedMessage = await message.populate('sender', 'name email avatar');
    
    if (req.io) {
      req.io.emit('message_updated', populatedMessage);
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
    const mongoose = require('mongoose');
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const workspaceId = new mongoose.Types.ObjectId(req.params.workspaceId);

    // Fetch channels for this workspace
    const Channel = require('../models/Channel');
    const channels = await Channel.find({ workspace: req.params.workspaceId });
    const channelIds = channels.map(c => c._id);

    const unreadMessages = await Message.aggregate([
      {
        $match: {
          channel: { $in: channelIds },
          sender: { $ne: userId },
          readBy: { $ne: userId }
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

    // Fetch DMs for this workspace where user is a participant
    const DM = require('../models/DM');
    const dms = await DM.find({ workspace: req.params.workspaceId, participants: req.user._id });
    const dmIds = dms.map(dm => dm._id);

    const DMMessage = require('../models/DMMessage');
    const dmUnreadMessages = await DMMessage.aggregate([
      {
        $match: {
          dm: { $in: dmIds },
          sender: { $ne: userId },
          readBy: { $ne: userId }
        }
      },
      {
        $group: {
          _id: "$sender",
          count: { $sum: 1 }
        }
      }
    ]);
    
    dmUnreadMessages.forEach(item => {
      if (item._id) {
        unreadCounts[`user-${item._id.toString()}`] = item.count;
      }
    });

    res.status(200).json(unreadCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
