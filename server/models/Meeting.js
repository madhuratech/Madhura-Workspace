const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a meeting title'],
    trim: true,
  },
  date: {
    type: Date,
    required: [true, 'Please provide a meeting date']
  },
  time: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['google_meet', 'direct_meet'],
    default: 'direct_meet'
  },
  link: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoCallId: {
    type: String,
    default: ''
  },
  recordingUrl: {
    type: String,
    default: ''
  },
  aiNotes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed'],
    default: 'scheduled'
  },
  attendedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model('Meeting', MeetingSchema);
