const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Please add message text']
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isEdited: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
