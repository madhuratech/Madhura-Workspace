const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { sendNotification } = require('./notificationController');

// @desc    Get all workspaces for user
// @route   GET /api/workspaces
// @access  Private
const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    }).populate('owner', 'name email').populate('members.user', 'name email avatar');

    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new workspace
// @route   POST /api/workspaces
// @access  Private
const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Please add a workspace name' });
    }

    const workspace = await Workspace.create({
      name,
      description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'super_admin' }],
    });

    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single workspace
// @route   GET /api/workspaces/:id
// @access  Private
const getWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user is member or owner
    const isMember = workspace.members.find(m => m.user && m.user._id.toString() === req.user._id.toString());
    if (workspace.owner._id.toString() !== req.user._id.toString() && !isMember) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update workspace
// @route   PUT /api/workspaces/:id
// @access  Private
const updateWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Only owner or super_admin can update
    const member = workspace.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    if (workspace.owner.toString() !== req.user._id.toString() && (!member || member.role !== 'super_admin')) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedWorkspace = await Workspace.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updatedWorkspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete workspace
// @route   DELETE /api/workspaces/:id
// @access  Private
const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized. Only owner can delete.' });
    }

    await workspace.deleteOne();

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to workspace
// @route   POST /api/workspaces/:id/members
// @access  Private
const addMember = async (req, res) => {
  try {
    const { email, role, name, password } = req.body;

    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check auth
    const currentMember = workspace.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    if (workspace.owner.toString() !== req.user._id.toString() && (!currentMember || currentMember.role !== 'super_admin')) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    let userToAdd = await User.findOne({ email });

    // If user does not exist, CREATE the user account instantly with global role!
    if (!userToAdd) {
      if (!name || !password) {
        return res.status(400).json({ message: 'User does not exist. Please provide a Name and Password to create the account.' });
      }
      userToAdd = await User.create({
        name,
        email,
        password,
        role: role || 'employee'   // ← Set global role so backend filters work
      });
    } else {
      // If user exists, sync their global role too
      userToAdd.role = role || 'employee';
      await userToAdd.save();
    }

    // Check if user is already in the workspace
    const memberExists = workspace.members.find(m => m.user && m.user.toString() === userToAdd.id.toString());
    if (memberExists) {
      return res.status(400).json({ message: 'User already in workspace' });
    }

    workspace.members.push({ user: userToAdd._id, role: role || 'employee' });
    await workspace.save();

    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update/Remove member in workspace
// @route   PUT /api/workspaces/:id/members/:userId
// @access  Private
const updateMember = async (req, res) => {
  try {
    const { role, action } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    // Check auth
    const currentMember = workspace.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    if (workspace.owner.toString() !== req.user._id.toString() && (!currentMember || currentMember.role !== 'super_admin')) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const memberIndex = workspace.members.findIndex(m => m.user && m.user.toString() === req.params.userId);
    if (memberIndex === -1) return res.status(404).json({ message: 'Member not found' });

    if (action === 'remove') {
      workspace.members.splice(memberIndex, 1);
    } else {
      workspace.members[memberIndex].role = role;
      // Sync global User role so backend filters (tasks, projects) work correctly
      await User.findByIdAndUpdate(req.params.userId, { role });

      sendNotification(
        req,
        req.params.userId,
        'role_changed',
        'Role Updated',
        `Your role in the workspace has been updated to ${role.replace('_', ' ')}.`,
        '/team'
      );
    }

    await workspace.save();

    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  updateMember
};
