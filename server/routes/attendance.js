const express = require('express');
const router = express.Router({ mergeParams: true });
const Attendance = require('../models/Attendance');
const Workspace = require('../models/Workspace');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Get attendance records
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    // Check role
    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    const member = workspace.members.find(m => m.user._id.toString() === req.userId);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    let filter = { workspace: workspaceId };
    
    // Employees can only see their own attendance
    if (member.role === 'employee') {
      filter.user = req.userId;
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

    const existing = await Attendance.findOne({ workspace: workspaceId, user: req.userId, date: dateStr });
    if (existing) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    const record = new Attendance({
      workspace: workspaceId,
      user: req.userId,
      date: dateStr,
      checkIn: new Date(),
      status: 'Present'
    });

    await record.save();
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

    const record = await Attendance.findOne({ workspace: workspaceId, user: req.userId, date: dateStr });
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
