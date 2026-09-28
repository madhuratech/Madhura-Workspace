const express = require('express');
const router = express.Router({ mergeParams: true });
const EarlyLeave = require('../models/EarlyLeave');
const Attendance = require('../models/Attendance');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendNotification } = require('../controllers/notificationController');

router.use(protect);

// 1. Employee requests early leave
router.post('/', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { reason, requestedLeaveTime } = req.body;
    const dateStr = new Date().toISOString().split('T')[0];

    // Check if an early leave request already exists today
    const existing = await EarlyLeave.findOne({ workspace: workspaceId, employee: req.user._id, date: dateStr });
    if (existing) {
      return res.status(400).json({ message: 'Early leave request already submitted for today' });
    }

    const earlyLeave = new EarlyLeave({
      workspace: workspaceId,
      employee: req.user._id,
      date: dateStr,
      reason,
      requestedLeaveTime,
      status: 'pending_hr'
    });

    await earlyLeave.save();

    // Notify only MD (Super Admin) and HR
    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    const mdAndHrs = workspace.members.filter(m => 
      m.user && 
      ['super_admin', 'hr'].includes(m.role) && 
      m.user._id.toString() !== req.user._id.toString()
    );
    
    for (const admin of mdAndHrs) {
      await sendNotification(
        req,
        admin.user._id,
        'alert',
        'Early Leave Request',
        `${req.user.name} has requested to leave early at ${requestedLeaveTime}. Reason: ${reason}`,
        `/attendance`
      );
    }

    res.status(201).json(earlyLeave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Get early leave requests based on user role (Only MD & HR see all; TL & Employees see only their own)
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    const member = workspace.members.find(m => m.user._id.toString() === req.user._id.toString());
    
    if (!member) return res.status(403).json({ message: 'Access denied' });

    let filter = { workspace: workspaceId };
    
    if (member.role === 'super_admin' || member.role === 'hr') {
      // MD & HR see all requests
      filter = { workspace: workspaceId };
    } else {
      // Employees and TLs only see their own requests
      filter.employee = req.user._id;
    }

    const requests = await EarlyLeave.find(filter)
      .populate('employee', 'name email avatar')
      .sort({ createdAt: -1 });
      
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 3. Approve early leave (MD and HR can approve)
router.put('/:id/approve', async (req, res) => {
  try {
    const { workspaceId, id } = req.params;
    const { note } = req.body;
    
    const earlyLeave = await EarlyLeave.findById(id).populate('employee', 'name');
    if (!earlyLeave) return res.status(404).json({ message: 'Request not found' });

    const workspace = await Workspace.findById(workspaceId);
    const member = workspace.members.find(m => m.user.toString() === req.user._id.toString());
    const role = member ? member.role : 'employee';

    if (role === 'hr' || role === 'super_admin') {
      earlyLeave.status = 'approved';
      if (role === 'hr') {
        earlyLeave.hrApprovedBy = req.user._id;
        earlyLeave.hrApprovedAt = new Date();
        earlyLeave.hrNote = note;
      } else {
        earlyLeave.mdApprovedBy = req.user._id;
        earlyLeave.mdApprovedAt = new Date();
        earlyLeave.mdNote = note;
      }
      
      // Notify Employee
      await sendNotification(req, earlyLeave.employee._id, 'success', 'Early Leave Approved', `Your early leave request for ${earlyLeave.requestedLeaveTime} has been approved. You can now punch out.`, `/attendance`);
      
      // Mark attendance as earlyLeaveApproved
      const attendance = await Attendance.findOne({ workspace: workspaceId, user: earlyLeave.employee._id, date: earlyLeave.date });
      if (attendance) {
        attendance.earlyLeaveApproved = true;
        attendance.isEarlyLeave = true;
        await attendance.save();
      }
    } else {
      return res.status(403).json({ message: 'Only MD and HR are authorized to approve early leave requests' });
    }

    await earlyLeave.save();
    res.json(earlyLeave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 4. Reject early leave
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const earlyLeave = await EarlyLeave.findById(id).populate('employee', 'name');
    if (!earlyLeave) return res.status(404).json({ message: 'Request not found' });

    earlyLeave.status = 'rejected';
    earlyLeave.rejectedBy = req.user._id;
    earlyLeave.rejectedAt = new Date();
    earlyLeave.rejectionNote = reason;
    await earlyLeave.save();

    // Notify Employee
    await sendNotification(req, earlyLeave.employee._id, 'alert', 'Early Leave Rejected', `Your early leave request was rejected. Reason: ${reason || 'None provided'}`, `/attendance`);

    res.json(earlyLeave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
