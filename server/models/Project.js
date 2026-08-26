const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a project title'],
    trim: true,
  },
  description: {
    type: String,
  },
  projectType: {
    type: [String],
    default: ['Software']
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Active', 'Completed'],
    default: 'Active'
  },
  coordinator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  stage: {
    type: String,
    default: 'Proposal'
  },
  deliverables: [{
    stage: String,
    link: String,
    fileUrl: String,
    fileName: String,
    notes: String,
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date, default: Date.now }
  }],
  rollbackRequest: {
    isRequested: { type: Boolean, default: false },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    targetStage: String
  },
  workflowTeams: {
    uiux: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    tech: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    devops: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    digitalMarketing: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    seo: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
