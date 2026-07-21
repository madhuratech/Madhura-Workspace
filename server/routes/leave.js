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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
