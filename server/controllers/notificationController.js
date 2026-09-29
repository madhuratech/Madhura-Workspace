const Notification = require('../models/Notification');
const User = require('../models/User');
const axios = require('axios');

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .populate('sender', 'name email avatar')
      .limit(50); // Keep it reasonable
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete single notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    await Notification.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications/delete-all
// @access  Private
const deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    res.status(200).json({ message: 'All notifications deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to send notification internally from other controllers
const sendNotification = async (req, recipientId, type, title, message, link) => {
  try {
    // 1. Save to DB
    const notification = await Notification.create({
      recipient: recipientId,
      sender: req.user ? req.user._id : null,
      type,
      title,
      message,
      link
    });

    // 2. Emit to socket if user is online
    if (req.io && req.onlineUsers) {
      const socketIds = req.onlineUsers.get(recipientId.toString());
      if (socketIds) {
        // Populate sender so the frontend can display their avatar
        const populatedNotification = await Notification.findById(notification._id).populate('sender', 'name email avatar');
        
        if (socketIds instanceof Set || Array.isArray(socketIds)) {
          socketIds.forEach(socketId => {
            req.io.to(socketId).emit('new_notification', populatedNotification || notification);
          });
        } else if (typeof socketIds === 'string') {
          // Fallback if server.js hasn't been restarted and still uses string map
          req.io.to(socketIds).emit('new_notification', populatedNotification || notification);
        }
      }
    }

    // 3. Dispatch Expo Push Notification (for background / closed app)
    const recipientUser = await User.findById(recipientId).select('pushToken notificationSettings');
    if (recipientUser && recipientUser.pushToken) {
      const isMuted = recipientUser.notificationSettings?.muteAll || 
        (recipientUser.notificationSettings?.mutedUntil && new Date(recipientUser.notificationSettings.mutedUntil) > new Date());
      
      if (!isMuted) {
        try {
          await axios.post('https://exp.host/--/api/v2/push/send', {
            to: recipientUser.pushToken,
            sound: 'default',
            title: title || 'Madhura Workspace',
            body: message,
            data: { link, type, notificationId: notification._id },
            priority: 'high',
            channelId: 'default',
          }, {
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            }
          });
        } catch (pushErr) {
          console.error('[PUSH NOTIFICATION] Error sending Expo push notification:', pushErr.message);
        }
      }
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteAllNotifications,
  deleteNotification,
  sendNotification
};
