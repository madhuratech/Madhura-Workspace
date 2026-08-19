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

// @desc    Request Admin password reset OTP
// @route   POST /api/users/:id/reset-password-otp
// @access  Private/SuperAdmin
const requestPasswordResetOTP = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();
    
    // Send email using Resend
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Madhura Workspace <onboarding@resend.dev>',
      to: user.email,
      subject: 'Password Reset Request OTP',
      html: `<p>Your administrator has requested a password reset for your account.</p>
             <p>Your OTP is: <strong>${otp}</strong></p>
             <p>This OTP will expire in 10 minutes.</p>`
    });
    
    if (result.error) {
      console.log('Resend Error:', result.error);
      return res.status(200).json({ 
        message: `OTP generated, but email failed (unverified domain). OTP is: ${otp}`, 
        otp: otp,
        emailFailed: true
      });
    }
    
    res.status(200).json({ message: 'OTP sent successfully to the user', otp: otp });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin reset user password
// @route   PUT /api/users/:id/reset-password
// @access  Private/SuperAdmin
const resetUserPassword = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { otp, newPassword } = req.body;
    if (!otp || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'OTP and a new password (min 6 characters) are required' });
    }
    
    const user = await User.findById(req.params.id).select('+password +resetPasswordOTP +resetPasswordOTPExpiry');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.resetPasswordOTP !== otp || user.resetPasswordOTPExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiry = undefined;
    await user.save();
    
    res.status(200).json({ message: 'Password reset successfully' });
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
  updateUserRole,
  changePassword,
  requestPasswordResetOTP,
  resetUserPassword,
  getUserById,
  updateAvatar
};
