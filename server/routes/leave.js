const express = require('express');
const router = express.Router({ mergeParams: true });
const Leave = require('../models/Leave');
const Workspace = require('../models/Workspace');
const { protect } = require('../middleware/auth');

router.use(protect);

// Apply for leave
router.post('/', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { type, startDate, endDate, reason } = req.body;

    const leave = new Leave({
      workspace: workspaceId,
      user: req.user._id,
      type,
      startDate,
      endDate,
      reason
    });

    await leave.save();

    // Send Notification ONLY to MD (Super Admin) and HR
    const workspace = await Workspace.findById(workspaceId).populate('members.user');

    const notifRecipients = workspace.members.filter(m => {
      if (!m.user || m.user._id.toString() === req.user._id.toString()) return false;
      return m.role === 'super_admin' || m.role === 'hr';
    });

    const Notification = require('../models/Notification');
    for (const rec of notifRecipients) {
      const notif = new Notification({
        recipient: rec.user._id,
        sender: req.user._id,
        type: 'general',
        title: 'New Leave Request',
        message: `${req.user.name} has applied for ${type} leave.`,
        link: '/attendance'
      });
      await notif.save();

      const socketIds = req.onlineUsers ? req.onlineUsers.get(rec.user._id.toString()) : null;
      if (socketIds && req.io) {
        if (socketIds instanceof Set || Array.isArray(socketIds)) {
          socketIds.forEach(socketId => {
            req.io.to(socketId).emit('new_notification', notif);
          });
        } else if (typeof socketIds === 'string') {
          req.io.to(socketIds).emit('new_notification', notif);
        }
      }
    }

    res.status(201).json(leave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leaves (Only MD & HR see all; TL & Employees see only their own)
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    const member = workspace.members.find(m => m.user._id.toString() === req.user._id.toString());
    if (!member) return res.status(403).json({ message: 'Access denied' });

    const leaves = await Leave.find({ workspace: workspaceId })
      .populate('user', 'name email')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    let filteredLeaves = leaves;

    if (member.role === 'super_admin' || member.role === 'hr') {
      // MD and HR see all leaves
      filteredLeaves = leaves;
    } else {
      // Employees and Team Leaders see only their own leaves
      filteredLeaves = leaves.filter(l => l.user && l.user._id.toString() === req.user._id.toString());
    }

    res.json(filteredLeaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve/Reject leave (MD and HR authorized)
router.put('/:id/status', async (req, res) => {
  try {
    const { workspaceId, id } = req.params;
    const { status } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    const member = workspace.members.find(m => m.user.toString() === req.user._id.toString());
    
    if (!member || (member.role !== 'super_admin' && member.role !== 'hr')) {
      return res.status(403).json({ message: 'Only MD and HR are authorized to approve leaves' });
    }

    const leave = await Leave.findById(id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    leave.status = status;
    leave.approvedBy = req.user._id;
    await leave.save();

    res.json(leave);

    // Notify the user
    const Notification = require('../models/Notification');
    const notif = new Notification({
      recipient: leave.user,
      sender: req.user._id,
      type: 'general',
      title: 'Leave Request Updated',
      message: `Your leave request has been ${status.toLowerCase()} by ${req.user.name}.`,
      link: '/attendance'
    });
    await notif.save();

    const socketIds = req.onlineUsers ? req.onlineUsers.get(leave.user.toString()) : null;
    if (socketIds && req.io) {
      if (socketIds instanceof Set || Array.isArray(socketIds)) {
        socketIds.forEach(socketId => {
          req.io.to(socketId).emit('new_notification', notif);
        });
      } else if (typeof socketIds === 'string') {
        req.io.to(socketIds).emit('new_notification', notif);
      }
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
