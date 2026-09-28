const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/SuperAdmin
const getUsers = async (req, res) => {
  try {
    // Only super admin can get all system users
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Don't return passwords
    const users = await User.find({}).select('-password').lean();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user presence status
// @route   PUT /api/users/status
// @access  Private
const updatePresence = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Busy', 'Break', 'Lunch', 'Away', 'Leave'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { presenceStatus: status },
      { new: true }
    ).select('-password');
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user notification settings
// @route   PUT /api/users/notification-settings
// @access  Private
const updateNotificationSettings = async (req, res) => {
  try {
    const { notificationSettings } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { notificationSettings },
      { new: true }
    ).select('-password');
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/SuperAdmin
const updateUserRole = async (req, res) => {
  try {
    // Only super admin can update global roles
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { role } = req.body;
    if (!['super_admin', 'hr', 'team_leader', 'employee'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Sync role across all workspaces this user belongs to
    const Workspace = require('../models/Workspace');
    await Workspace.updateMany(
      { 'members.user': req.params.id },
      { $set: { 'members.$.role': role } }
    );

    // If downgraded to employee, unset as team leader in any teams
    if (role === 'employee') {
      const Team = require('../models/Team');
      await Team.updateMany(
        { leader: req.params.id },
        { $unset: { leader: 1 } }
      );
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');
    
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin / HR reset user password
// @route   PUT /api/users/:id/reset-password
// @access  Private (SuperAdmin or HR)
const resetUserPassword = async (req, res) => {
  try {
    if (!['super_admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only MD and HR are authorized to reset employee passwords' });
    }
    
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.password = newPassword;
    await user.save();

    // Send in-app notification to the user
    try {
      const { sendNotification } = require('./notificationController');
      await sendNotification(
        req,
        user._id,
        'password_reset_success',
        '🔑 Password Reset Completed',
        `Your password was reset by ${req.user.name} (${req.user.role === 'super_admin' ? 'MD' : 'HR'}). Please use your new password to sign in.`,
        '/settings'
      );
    } catch (notifErr) {
      console.error('Failed to send reset confirmation notification', notifErr);
    }
    
    res.status(200).json({ message: `Password for ${user.name} has been reset successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user avatar
// @route   PUT /api/users/avatar
// @access  Private
const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body; // Expecting a Base64 string
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  updatePresence,
  updateNotificationSettings,
  updateUserRole,
  changePassword,
  resetUserPassword,
  getUserById,
  updateAvatar
};
