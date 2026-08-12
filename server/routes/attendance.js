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
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const existing = await Attendance.findOne({ workspace: workspaceId, user: req.user._id, date: dateStr });
    if (existing) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    // Calculate Late from 9:40 AM (IST)
    let isLate = false;
    let lateMinutes = 0;
    
    // Get current time in Asia/Kolkata (IST)
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istString);
    const checkInHour = istDate.getHours();
    const checkInMinute = istDate.getMinutes();

    // 9:40 AM is the cutoff
    if (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 40)) {
      isLate = true;
      // Calculate minutes late from 9:40 AM
      const lateTimeInMinutes = (checkInHour * 60 + checkInMinute) - (9 * 60 + 40);
      lateMinutes = lateTimeInMinutes > 0 ? lateTimeInMinutes : 0;
    }

    const record = new Attendance({
      workspace: workspaceId,
      user: req.user._id,
      date: dateStr,
      checkIn: now,
      status: 'Present',
      isLate,
      lateMinutes
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
            `${req.user.name} has punched in${isLate ? ` (Late by ${lateMinutes} mins)` : ''}.`,
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
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const record = await Attendance.findOne({ workspace: workspaceId, user: req.user._id, date: dateStr });
    if (!record) {
      return res.status(400).json({ message: 'No check-in found for today' });
    }

    if (record.checkOut) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    // Check early leave: Before 18:00 (6:00 PM) (IST)
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istString);
    const checkOutHour = istDate.getHours();
    
    // If it's before 18:00 (6 PM) and they haven't been approved for early leave
    if (checkOutHour < 18 && !record.earlyLeaveApproved) {
      return res.status(400).json({ 
        message: 'It is before 6:00 PM. Please request early leave permission first.',
        requiresEarlyLeave: true 
      });
    }

    record.checkOut = now;
    await record.save();

    res.json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
