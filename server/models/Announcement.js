const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title for the announcement']
  },
  content: {
    type: String,
    required: [true, 'Please add the content for the announcement']
  },
  type: {
    type: String,
    enum: ['Company', 'Department', 'Alert'],
    default: 'Company'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
