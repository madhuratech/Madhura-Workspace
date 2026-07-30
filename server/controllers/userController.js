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
    const users = await User.find({}).select('-password');
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
    if (!['Active', 'Busy', 'Break', 'Away'].includes(status)) {
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
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  updatePresence,
  updateNotificationSettings,
  updateUserRole
};
