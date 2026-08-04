const express = require('express');
const router = express.Router({ mergeParams: true });
const Attendance = require('../models/Attendance');
const Workspace = require('../models/Workspace');
const { protect } = require('../middleware/auth');

router.use(protect);

// Get attendance records
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    // Check role
    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    const member = workspace.members.find(m => m.user._id.toString() === req.user._id.toString());
    if (!member) return res.status(403).json({ message: 'Access denied' });

    let filter = { workspace: workspaceId };
    
    // Employees and TLs can only see their own attendance
    if (member.role === 'employee' || member.role === 'team_leader') {
      filter.user = req.user._id;
    }

    const records = await Attendance.find(filter).populate('user', 'name email').sort({ date: -1 });
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check in
router.post('/checkin', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const dateStr = new Date().toISOString().split('T')[0];

    const existing = await Attendance.findOne({ workspace: workspaceId, user: req.user._id, date: dateStr });
    if (existing) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    const record = new Attendance({
      workspace: workspaceId,
      user: req.user._id,
      date: dateStr,
      checkIn: new Date(),
      status: 'Present'
    });

    await record.save();
    
    // Notify HR and Super Admins
    try {
      const User = require('../models/User');
      const { sendNotification } = require('../controllers/notificationController');
      const admins = await User.find({ role: { $in: ['super_admin', 'hr'] } }).select('_id');
      
      for (const admin of admins) {
        if (admin._id.toString() !== req.user._id.toString()) {
          await sendNotification(
            req,
            admin._id,
            'general',
            'Employee Punched In',
            `${req.user.name} has punched in (Started).`,
            `/attendance`
          );
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify admins for checkin:', notifErr);
    }

    res.status(201).json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check out
router.put('/checkout', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const dateStr = new Date().toISOString().split('T')[0];

    const record = await Attendance.findOne({ workspace: workspaceId, user: req.user._id, date: dateStr });
    if (!record) {
      return res.status(400).json({ message: 'No check-in found for today' });
    }

    if (record.checkOut) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    record.checkOut = new Date();
    await record.save();

    res.json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
