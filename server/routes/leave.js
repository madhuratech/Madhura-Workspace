const express = require('express');
const router = express.Router({ mergeParams: true });
const Leave = require('../models/Leave');
const Workspace = require('../models/Workspace');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Apply for leave
router.post('/', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { type, startDate, endDate, reason } = req.body;

    const leave = new Leave({
      workspace: workspaceId,
      user: req.userId,
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
    
    const member = workspace.members.find(m => m.user._id.toString() === req.userId);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    let filter = { workspace: workspaceId };
    
    // Employees can only see their own leaves
    if (member.role === 'employee') {
      filter.user = req.userId;
    }

    const leaves = await Leave.find(filter)
      .populate('user', 'name email')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });
      
    res.json(leaves);
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
    const member = workspace.members.find(m => m.user.toString() === req.userId);
    
    if (!member || (member.role !== 'super_admin' && member.role !== 'hr' && member.role !== 'team_leader')) {
      return res.status(403).json({ message: 'Not authorized to approve leaves' });
    }

    const leave = await Leave.findById(id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    leave.status = status;
    leave.approvedBy = req.userId;
    await leave.save();

    res.json(leave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
