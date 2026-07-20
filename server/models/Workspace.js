const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a workspace name'],
    trim: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      role: {
        type: String,
        enum: ['super_admin', 'hr', 'team_leader', 'employee'],
        default: 'employee'
      }
    }
  ],
  description: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Workspace', WorkspaceSchema);
