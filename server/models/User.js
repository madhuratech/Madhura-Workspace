const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false // Do not return password by default
  },
  avatar: {
    type: String,
    default: ''
  },
  designation: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['super_admin', 'hr', 'team_leader', 'employee'],
    default: 'employee'
  },
  presenceStatus: {
    type: String,
    enum: ['Active', 'Busy', 'Break', 'Away'],
    default: 'Active'
  },
  googleAccessToken: {
    type: String
  },
  googleRefreshToken: {
    type: String
  },
  googleTokenExpiry: {
    type: Number
  },
  notificationSettings: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    taskReminders: { type: Boolean, default: true }
  }
}, { timestamps: true });

// Encrypt password using bcrypt
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
