const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { sendNotification } = require('./notificationController');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('author', 'name email avatar role')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Server Error fetching announcements' });
  }
};

// @desc    Create an announcement
// @route   POST /api/announcements
// @access  Private (Admin/HR)
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, type } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Please provide title and content' });
    }

    const announcement = await Announcement.create({
      title,
      content,
      type: type || 'Company',
      author: req.user._id
    });

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('author', 'name email avatar role');

    // Send notifications to ALL users
    const allUsers = await User.find({ _id: { $ne: req.user._id } }).select('_id');
    
    // Process notifications asynchronously to avoid blocking the response
    const notifyUsers = async () => {
      for (const u of allUsers) {
        try {
          await sendNotification(
            { user: req.user, io: req.io, onlineUsers: req.onlineUsers }, // mock req object enough for sendNotification
            u._id,
            'alert', // type
            `New ${populatedAnnouncement.type} Announcement`,
            title,
            '/announcements'
          );
        } catch (err) {
          console.error(`Failed to notify user ${u._id}:`, err);
        }
      }
    };
    
    notifyUsers();

    res.status(201).json(populatedAnnouncement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Server Error creating announcement' });
  }
};

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Admin/HR)
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Only author or super_admin can delete (though route middleware restricts to HR/Admin anyway)
    if (announcement.author.toString() !== req.user._id.toString() && req.user.role !== 'super_admin') {
       return res.status(403).json({ message: 'Not authorized to delete this announcement' });
    }

    await announcement.deleteOne();
    res.json({ message: 'Announcement removed' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: 'Server Error deleting announcement' });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement
};
