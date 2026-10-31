const mongoose = require('mongoose');
const { encryptText, decryptText } = require('../utils/crypto');

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
    default: '',
    set: (val) => encryptText(val),
    get: (val) => decryptText(val)
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
  isDeleted: {
    type: Boolean,
    default: false
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: [{
    emoji: {
      type: String,
      required: true
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }]
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

module.exports = mongoose.model('DMMessage', DMMessageSchema);
