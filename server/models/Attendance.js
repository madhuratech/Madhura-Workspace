const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half-Day'],
    default: 'Present'
  },
  checkIn: {
    type: Date
  },
  checkOut: {
    type: Date
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  isEarlyLeave: {
    type: Boolean,
    default: false
  },
  earlyLeaveApproved: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Ensure a user only has one attendance record per day per workspace
attendanceSchema.index({ workspace: 1, user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
