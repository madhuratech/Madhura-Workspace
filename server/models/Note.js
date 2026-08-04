const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#ffffff' // Default to white
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  attachments: [{
    fileName: String,
    url: String,
    fileType: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Note', NoteSchema);
