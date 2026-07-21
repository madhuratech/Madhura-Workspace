const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
  workspace: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Workspace', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recipients: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  bcc: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  subject: { 
    type: String, 
    default: '' 
  },
  message: { 
    type: String, 
    default: '' 
  },
  isDraft: { 
    type: Boolean, 
    default: false 
  },
  readBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  starredBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  trashBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, { timestamps: true });

module.exports = mongoose.model('Email', EmailSchema);
