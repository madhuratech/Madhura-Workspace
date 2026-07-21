const mongoose = require('mongoose');

const DMMessageSchema = new mongoose.Schema({
  dm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DM',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  attachment: {
    url: String,
    fileType: String,
    fileName: String
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model('DMMessage', DMMessageSchema);
