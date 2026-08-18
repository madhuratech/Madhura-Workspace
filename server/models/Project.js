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
    enum: ['UI/UX', 'Tech', 'Test', 'DevOps', 'Completed'],
    default: 'UI/UX'
  },
  workflowTeams: {
    uiux: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    tech: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    devops: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
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
