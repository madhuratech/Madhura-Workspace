const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false // some actions like login aren't strictly workspace-bound initially
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    // Using a more open string, but these are typical values:
    // 'LOGIN', 'LOGOUT', 'CREATE_TASK', 'UPDATE_TASK', 'DELETE_TASK',
    // 'CREATE_PROJECT', 'UPDATE_PROJECT', 'DELETE_PROJECT',
    // 'WORKSPACE_UPDATE', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'ROLE_UPDATED',
    // 'INVITATION_SENT', 'FILE_UPLOADED', 'CREATE_CHANNEL'
  },
  entityType: {
    type: String,
    required: false // e.g., 'Task', 'Project', 'User'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  details: {
    type: String, // Human readable string, e.g. "User updated task status to In Progress"
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // flexible object for old/new values
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
