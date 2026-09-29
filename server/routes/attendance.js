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

    const records = await Attendance.find(filter).populate('user', 'name email designation shiftStartTime shiftEndTime').sort({ date: -1 });
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

    // Calculate Late based on employee's custom shiftStartTime (defaults to 09:40 AM IST)
    let isLate = false;
    let lateMinutes = 0;
    
    // Get current time in Asia/Kolkata (IST)
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istString);
    const checkInHour = istDate.getHours();
    const checkInMinute = istDate.getMinutes();

    const userShiftStart = req.user.shiftStartTime || '09:40';
    const [startHourStr, startMinStr] = userShiftStart.split(':');
    const targetStartHour = parseInt(startHourStr, 10) || 9;
    const targetStartMin = parseInt(startMinStr, 10) || 40;

    const totalCheckInMinutes = checkInHour * 60 + checkInMinute;
    const totalShiftStartMinutes = targetStartHour * 60 + targetStartMin;

    if (totalCheckInMinutes > totalShiftStartMinutes) {
      isLate = true;
      lateMinutes = totalCheckInMinutes - totalShiftStartMinutes;
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
          let lateString = '';
          if (isLate) {
            const h = Math.floor(lateMinutes / 60);
            const m = lateMinutes % 60;
            if (h > 0 && m > 0) lateString = ` (Late by ${h} hour ${m} mins based on ${userShiftStart} shift)`;
            else if (h > 0) lateString = ` (Late by ${h} hour based on ${userShiftStart} shift)`;
            else lateString = ` (Late by ${m} mins based on ${userShiftStart} shift)`;
          }

          await sendNotification(
            req,
            admin._id,
            'general',
            'Employee Punched In',
            `${req.user.name} has punched in${lateString}.`,
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

    // Check early leave based on employee's custom shiftEndTime (defaults to 18:00 IST)
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istString);
    const checkOutHour = istDate.getHours();
    const checkOutMinute = istDate.getMinutes();

    const userShiftEnd = req.user.shiftEndTime || '18:00';
    const [endHourStr, endMinStr] = userShiftEnd.split(':');
    const targetEndHour = parseInt(endHourStr, 10) || 18;
    const targetEndMin = parseInt(endMinStr, 10) || 0;

    const totalCheckOutMinutes = checkOutHour * 60 + checkOutMinute;
    const totalShiftEndMinutes = targetEndHour * 60 + targetEndMin;
    
    // If it's before shift end time and they haven't been approved for early leave
    if (totalCheckOutMinutes < totalShiftEndMinutes && !record.earlyLeaveApproved) {
      return res.status(400).json({ 
        message: `It is before your shift end time (${userShiftEnd}). Please request early leave permission first.`,
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
