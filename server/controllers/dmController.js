const DM = require('../models/DM');
const DMMessage = require('../models/DMMessage');
const Workspace = require('../models/Workspace');

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

    res.status(200).json(messages);
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
