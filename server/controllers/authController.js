const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { logActivity } = require('./auditController');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Public registration is only available for the very first Super Admin setup
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(403).json({ 
        message: 'Public registration is closed. Please ask your Managing Director or HR for an invitation.' 
      });
    }

    // Create initial Super Admin (password is hashed in pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      role: 'super_admin',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        presenceStatus: user.presenceStatus,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      // Log login activity (workspace is null since it's a global action)
      await logActivity({
        workspace: null,
        user: user._id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user._id,
        details: 'User logged in successfully'
      });

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        presenceStatus: user.presenceStatus,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request password reset (notifies Super Admin / MD and HR)
// @route   POST /api/auth/forgot-password
// @access  Public
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Please provide your registered email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No registered user found with this email address' });
    }

    // Find all Super Admins (MD) and HR users
    const adminsAndHr = await User.find({
      role: { $in: ['super_admin', 'hr'] }
    });

    const roleFormatted = user.role ? user.role.replace(/_/g, ' ').toUpperCase() : 'EMPLOYEE';

    // Dispatch notifications to MD & HR
    const { sendNotification } = require('./notificationController');
    for (const admin of adminsAndHr) {
      await sendNotification(
        req,
        admin._id,
        'password_reset',
        '🔑 Password Reset Request',
        `${user.name} (${user.email} - ${roleFormatted}) requested a password reset. Click to set a new password.`,
        `/team?resetUser=${user._id}`
      );
    }

    // Log activity
    await logActivity({
      workspace: null,
      user: user._id,
      action: 'PASSWORD_RESET_REQUEST',
      entityType: 'User',
      entityId: user._id,
      details: `${user.name} requested a password reset via login page`
    });

    res.status(200).json({
      message: 'Password reset request submitted successfully! Your Managing Director (MD) and HR have been notified to update your password.'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Server error processing password reset request' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  requestPasswordReset,
};

