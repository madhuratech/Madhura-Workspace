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
      status: 'pending_tl'
    });

    await earlyLeave.save();

    // Notify Team Leaders
    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    const tls = workspace.members.filter(m => m.role === 'team_leader');
    
    for (const tl of tls) {
      await sendNotification(
        req,
        tl.user._id,
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

// 2. Get early leave requests based on user role
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    const member = workspace.members.find(m => m.user._id.toString() === req.user._id.toString());
    
    if (!member) return res.status(403).json({ message: 'Access denied' });

    let filter = { workspace: workspaceId };
    
    if (member.role === 'employee') {
      filter.employee = req.user._id;
    } else if (member.role === 'team_leader') {
      // TL sees their own requests AND requests from employees pending their approval or approved by them
      filter = {
        $or: [
          { employee: req.user._id },
          { workspace: workspaceId, status: { $in: ['pending_tl', 'pending_hr', 'pending_md', 'approved', 'rejected'] } }
        ]
      };
    } else if (member.role === 'hr') {
      // HR sees their own + pending HR + further
      filter = {
        $or: [
          { employee: req.user._id },
          { workspace: workspaceId, status: { $in: ['pending_hr', 'pending_md', 'approved', 'rejected'] } }
        ]
      };
    } else if (member.role === 'super_admin') {
      // MD sees all pending MD + further
      filter = { workspace: workspaceId }; 
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

// 3. Approve early leave (Role based logic)
router.put('/:id/approve', async (req, res) => {
  try {
    const { workspaceId, id } = req.params;
    const { note } = req.body;
    
    const earlyLeave = await EarlyLeave.findById(id).populate('employee', 'name');
    if (!earlyLeave) return res.status(404).json({ message: 'Request not found' });

    const workspace = await Workspace.findById(workspaceId);
    const member = workspace.members.find(m => m.user.toString() === req.user._id.toString());
    const role = member.role;

    if (role === 'team_leader' && earlyLeave.status === 'pending_tl') {
      earlyLeave.status = 'pending_hr';
      earlyLeave.tlApprovedBy = req.user._id;
      earlyLeave.tlApprovedAt = new Date();
      earlyLeave.tlNote = note;
      
      // Notify HR
      const hrs = workspace.members.filter(m => m.role === 'hr');
      for (const hr of hrs) {
        await sendNotification(req, hr.user, 'alert', 'Early Leave Approval Pending', `TL approved early leave for ${earlyLeave.employee.name}. Waiting for your approval.`, `/attendance`);
      }
    } 
    else if (role === 'hr' && earlyLeave.status === 'pending_hr') {
      earlyLeave.status = 'pending_md';
      earlyLeave.hrApprovedBy = req.user._id;
      earlyLeave.hrApprovedAt = new Date();
      earlyLeave.hrNote = note;
      
      // Notify MD
      const mds = workspace.members.filter(m => m.role === 'super_admin');
      for (const md of mds) {
        await sendNotification(req, md.user, 'alert', 'Early Leave Approval Pending', `HR approved early leave for ${earlyLeave.employee.name}. Waiting for MD approval.`, `/attendance`);
      }
    }
    else if (role === 'super_admin' && earlyLeave.status === 'pending_md') {
      earlyLeave.status = 'approved';
      earlyLeave.mdApprovedBy = req.user._id;
      earlyLeave.mdApprovedAt = new Date();
      earlyLeave.mdNote = note;
      
      // Notify Employee
      await sendNotification(req, earlyLeave.employee._id, 'success', 'Early Leave Approved', `Your early leave request has been approved by the MD. You can now punch out.`, `/attendance`);
      
      // Mark attendance as earlyLeaveApproved
      const attendance = await Attendance.findOne({ workspace: workspaceId, user: earlyLeave.employee._id, date: earlyLeave.date });
      if (attendance) {
        attendance.earlyLeaveApproved = true;
        attendance.isEarlyLeave = true;
        await attendance.save();
      }
    } else {
      return res.status(400).json({ message: 'Invalid action for your role or request status' });
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
