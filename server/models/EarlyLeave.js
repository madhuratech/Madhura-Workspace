const mongoose = require('mongoose');

const earlyLeaveSchema = new mongoose.Schema({
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  reason: { type: String, required: true },
  requestedLeaveTime: { type: String, required: true }, // HH:MM (24h)

  // Approval chain: employee → tl → hr → md
  // Status flow: pending_tl → pending_hr → pending_md → approved | rejected
  status: {
    type: String,
    enum: ['pending_tl', 'pending_hr', 'pending_md', 'approved', 'rejected'],
    default: 'pending_tl'
  },

  tlApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tlApprovedAt: { type: Date },
  tlNote: { type: String },

  hrApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hrApprovedAt: { type: Date },
  hrNote: { type: String },

  mdApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mdApprovedAt: { type: Date },
  mdNote: { type: String },

  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  rejectionNote: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('EarlyLeave', earlyLeaveSchema);
