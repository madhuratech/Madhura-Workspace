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
    let { reason, requestedLeaveTime } = req.body;
    const dateStr = new Date().toISOString().split('T')[0];

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Please provide a reason for early leave' });
    }

    if (!requestedLeaveTime) {
      requestedLeaveTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    // Check if an early leave request already exists today
    const existing = await EarlyLeave.findOne({ workspace: workspaceId, employee: req.user._id, date: dateStr });
    if (existing) {
      return res.status(400).json({ message: 'Early leave request already submitted for today' });
    }

    const earlyLeave = new EarlyLeave({
      workspace: workspaceId,
      employee: req.user._id,
      date: dateStr,
      reason: reason.trim(),
      requestedLeaveTime,
      status: 'pending_hr'
    });

    await earlyLeave.save();

    // Notify MD (Super Admin) and HR safely
    try {
      const workspace = await Workspace.findById(workspaceId).populate('members.user');
      if (workspace && workspace.members) {
        const mdAndHrs = workspace.members.filter(m => 
          m.user && 
          m.user._id &&
          ['super_admin', 'hr'].includes(m.role) && 
          m.user._id.toString() !== req.user._id.toString()
        );
        
        for (const admin of mdAndHrs) {
          await sendNotification(
            req,
            admin.user._id,
            'alert',
            'Early Leave Request',
            `${req.user.name || 'An employee'} has requested to leave early at ${requestedLeaveTime}. Reason: ${reason}`,
            `/attendance`
          ).catch(e => console.error('Notification send error:', e));
        }
      }
    } catch (notifErr) {
      console.error('Early leave notification error:', notifErr);
    }

    res.status(201).json(earlyLeave);
  } catch (error) {
    console.error('Error submitting early leave:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// 2. Get early leave requests based on user role (Only MD & HR see all; TL & Employees see only their own)
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    let userRole = req.user.role || 'employee';
    if (workspace.members) {
      const member = workspace.members.find(m => m.user && (m.user._id?.toString() === req.user._id.toString() || m.user.toString() === req.user._id.toString()));
      if (member) userRole = member.role;
    }

    let filter = { workspace: workspaceId };
    
    if (userRole !== 'super_admin' && userRole !== 'hr') {
      // Employees and TLs only see their own requests
      filter.employee = req.user._id;
    }

    const requests = await EarlyLeave.find(filter)
      .populate('employee', 'name email avatar')
      .sort({ createdAt: -1 });
      
    res.json(requests);
  } catch (error) {
    console.error('Error fetching early leaves:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Helper for approving early leave
const processApproval = async (req, res, id, note) => {
  const { workspaceId } = req.params;
  const earlyLeave = await EarlyLeave.findById(id).populate('employee', 'name');
  if (!earlyLeave) return res.status(404).json({ message: 'Request not found' });

  const workspace = await Workspace.findById(workspaceId);
  let userRole = req.user.role || 'employee';
  if (workspace && workspace.members) {
    const member = workspace.members.find(m => m.user && (m.user.toString() === req.user._id.toString() || m.user._id?.toString() === req.user._id.toString()));
    if (member) userRole = member.role;
  }

  if (userRole === 'hr' || userRole === 'super_admin') {
    earlyLeave.status = 'approved';
    if (userRole === 'hr') {
      earlyLeave.hrApprovedBy = req.user._id;
      earlyLeave.hrApprovedAt = new Date();
      earlyLeave.hrNote = note || '';
    } else {
      earlyLeave.mdApprovedBy = req.user._id;
      earlyLeave.mdApprovedAt = new Date();
      earlyLeave.mdNote = note || '';
    }
    
    // Notify Employee
    if (earlyLeave.employee && earlyLeave.employee._id) {
      sendNotification(req, earlyLeave.employee._id, 'success', 'Early Leave Approved', `Your early leave request for ${earlyLeave.requestedLeaveTime || 'today'} has been approved. You can now punch out.`, `/attendance`).catch(() => {});
    }
    
    // Mark attendance as earlyLeaveApproved
    const attendance = await Attendance.findOne({ workspace: workspaceId, user: earlyLeave.employee._id || earlyLeave.employee, date: earlyLeave.date });
    if (attendance) {
      attendance.earlyLeaveApproved = true;
      attendance.isEarlyLeave = true;
      await attendance.save();
    }
  } else {
    return res.status(403).json({ message: 'Only MD and HR are authorized to approve early leave requests' });
  }

  await earlyLeave.save();
  return res.json(earlyLeave);
};

// Helper for rejecting early leave
const processRejection = async (req, res, id, reason) => {
  const earlyLeave = await EarlyLeave.findById(id).populate('employee', 'name');
  if (!earlyLeave) return res.status(404).json({ message: 'Request not found' });

  earlyLeave.status = 'rejected';
  earlyLeave.rejectedBy = req.user._id;
  earlyLeave.rejectedAt = new Date();
  earlyLeave.rejectionNote = reason || 'Rejected by Admin';
  await earlyLeave.save();

  // Notify Employee
  if (earlyLeave.employee && earlyLeave.employee._id) {
    sendNotification(req, earlyLeave.employee._id, 'alert', 'Early Leave Rejected', `Your early leave request was rejected. Reason: ${reason || 'None provided'}`, `/attendance`).catch(() => {});
  }

  return res.json(earlyLeave);
};

// 3. Direct status update (used by Mobile app: PUT /:id with { status: 'approved' | 'rejected' })
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, reason } = req.body;

    if (status === 'approved') {
      return await processApproval(req, res, id, note);
    } else if (status === 'rejected') {
      return await processRejection(req, res, id, reason || note);
    } else {
      return res.status(400).json({ message: 'Invalid status' });
    }
  } catch (error) {
    console.error('Error updating early leave:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// 4. Approve early leave (used by Web app: PUT /:id/approve)
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    return await processApproval(req, res, id, note);
  } catch (error) {
    console.error('Error approving early leave:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// 5. Reject early leave (used by Web app: PUT /:id/reject)
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    return await processRejection(req, res, id, reason);
  } catch (error) {
    console.error('Error rejecting early leave:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;
