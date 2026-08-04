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

    // Send Notification to Admins/HR/TL
    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    const memberObj = workspace.members.find(m => m.user._id.toString() === req.user._id.toString());
    const role = memberObj ? memberObj.role : 'employee';

    const notifRecipients = workspace.members.filter(m => {
      if (m.user._id.toString() === req.user._id.toString()) return false;
      if (role === 'employee' && (m.role === 'team_leader' || m.role === 'hr' || m.role === 'super_admin')) return true;
      if (role === 'team_leader' && (m.role === 'hr' || m.role === 'super_admin')) return true;
      if (role === 'hr' && m.role === 'super_admin') return true;
      return false;
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
        socketIds.forEach(socketId => {
          req.io.to(socketId).emit('new_notification', notif);
        });
      }
    }

    res.status(201).json(leave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leaves
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

    if (member.role === 'employee') {
      filteredLeaves = leaves.filter(l => l.user._id.toString() === req.user._id.toString());
    } else if (member.role === 'team_leader') {
      filteredLeaves = leaves.filter(l => {
        if (l.user._id.toString() === req.user._id.toString()) return true; // Own leaves
        const lMember = workspace.members.find(m => m.user._id.toString() === l.user._id.toString());
        return lMember && lMember.role === 'employee'; // Leaves of employees
      });
    } else if (member.role === 'hr') {
      filteredLeaves = leaves.filter(l => {
        if (l.user._id.toString() === req.user._id.toString()) return true; // Own leaves
        const lMember = workspace.members.find(m => m.user._id.toString() === l.user._id.toString());
        return lMember && (lMember.role === 'employee' || lMember.role === 'team_leader'); // Leaves of employees & TLs
      });
    }
    // super_admin sees all

    res.json(filteredLeaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve/Reject leave
router.put('/:id/status', async (req, res) => {
  try {
    const { workspaceId, id } = req.params;
    const { status } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    const member = workspace.members.find(m => m.user.toString() === req.user._id.toString());
    
    if (!member || (member.role !== 'super_admin' && member.role !== 'hr' && member.role !== 'team_leader')) {
      return res.status(403).json({ message: 'Not authorized to approve leaves' });
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
      socketIds.forEach(socketId => {
        req.io.to(socketId).emit('new_notification', notif);
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
