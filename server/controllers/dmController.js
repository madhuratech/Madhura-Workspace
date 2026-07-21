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
      .sort({ createdAt: 1 });

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

    if (req.io) {
      req.io.emit('new_message', message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
