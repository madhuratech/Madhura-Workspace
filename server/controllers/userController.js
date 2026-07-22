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

module.exports = {
  getUsers,
  updatePresence
};
