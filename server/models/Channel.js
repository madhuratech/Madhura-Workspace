const mongoose = require('mongoose');

const ChannelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a channel name'],
    trim: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  description: {
    type: String
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Channel', ChannelSchema);
