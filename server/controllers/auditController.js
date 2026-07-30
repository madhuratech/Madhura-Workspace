const AuditLog = require('../models/AuditLog');

// Helper function to create an audit log (to be called from other controllers)
exports.logActivity = async ({ workspace, user, action, entityType, entityId, details, metadata }) => {
  try {
    await AuditLog.create({
      workspace,
      user,
      action,
      entityType,
      entityId,
      details,
      metadata
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

// @desc    Get audit logs for a workspace
// @route   GET /api/workspaces/:workspaceId/audit-logs
// @access  Private (Super Admin / HR)
exports.getAuditLogs = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    // Check if user is super_admin or hr
    if (req.user.role !== 'super_admin' && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Not authorized to view audit logs' });
    }

    const { page = 1, limit = 50, user, action, startDate, endDate } = req.query;

    const query = { workspace: workspaceId };

    if (user) query.user = user;
    if (action) query.action = action;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
