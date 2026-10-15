const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half-Day'],
    default: 'Present'
  },
  checkIn: {
    type: Date
  },
  checkOut: {
    type: Date
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  isEarlyLeave: {
    type: Boolean,
    default: false
  },
  earlyLeaveApproved: {
    type: Boolean,
    default: false
  },
  isAutoCheckOut: {
    type: Boolean,
    default: false
  },
  overtimeMinutes: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  overtimeReason: {
    type: String,
    default: ''
  },
  overtimeApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  overtimeApprovedAt: {
    type: Date
  },
  // ── Cryptographic Anti-Tamper Security ──────────────────────────────────────
  tamperSeal: {
    type: String, // HMAC-SHA256 signature calculated from canonical record state
    default: null,
    index: true
  },
  sealedAt: {
    type: Date
  },
  isPunchInLocked: {
    type: Boolean,
    default: true
  },
  isTampered: {
    type: Boolean,
    default: false
  },
  tamperReason: {
    type: String,
    default: ''
  },
  // ── Unforgeable AES-256 Encrypted Vault ────────────────────────────────────
  encryptedVault: {
    type: String, // Encrypted immutable backup of true punch-in state
    default: null
  }
}, { timestamps: true });

// Ensure a user only has one attendance record per day per workspace
attendanceSchema.index({ workspace: 1, user: 1, date: 1 }, { unique: true });

// ── Cache original values on load to enforce immutability ────────────────────
attendanceSchema.post('init', function () {
  this._initialCheckIn = this.checkIn ? new Date(this.checkIn).getTime() : null;
  this._initialDate = this.date;
  this._initialUser = this.user ? String(this.user._id || this.user) : null;
  this._initialWorkspace = this.workspace ? String(this.workspace._id || this.workspace) : null;
});

// ── Pre-Save: Enforce Punch-In Immutability & Recompute Cryptographic HMAC Seal ─
attendanceSchema.pre('save', function () {
  const { generateAttendanceSeal, createEncryptedVault } = require('../utils/attendanceSecurity');

  if (!this.isNew) {
    // 1. Check-in cannot be edited once punched in
    if (this._initialCheckIn !== null && this.checkIn) {
      const currentCheckInTime = new Date(this.checkIn).getTime();
      if (currentCheckInTime !== this._initialCheckIn) {
        throw new Error('IMMUTABLE_PUNCH_IN: Punch-in timestamp is permanently locked and cannot be edited.');
      }
    }

    // 2. Date, User, and Workspace cannot be modified once created
    if (this._initialDate && this.date !== this._initialDate) {
      throw new Error('IMMUTABLE_RECORD: Attendance date cannot be changed once created.');
    }
    const currentUserId = this.user ? String(this.user._id || this.user) : null;
    if (this._initialUser && currentUserId && currentUserId !== this._initialUser) {
      throw new Error('IMMUTABLE_RECORD: Attendance user cannot be changed once created.');
    }
    const currentWorkspaceId = this.workspace ? String(this.workspace._id || this.workspace) : null;
    if (this._initialWorkspace && currentWorkspaceId && currentWorkspaceId !== this._initialWorkspace) {
      throw new Error('IMMUTABLE_RECORD: Workspace identity cannot be changed once created.');
    }
  }

  // 3. Mark punch in permanently locked
  if (this.checkIn) {
    this.isPunchInLocked = true;
    // Lock original punch-in state inside encrypted vault if not already locked
    if (!this.encryptedVault) {
      this.encryptedVault = createEncryptedVault(this);
    }
  }

  // 4. Compute cryptographic HMAC-SHA256 digital seal using server secret key
  this.tamperSeal = generateAttendanceSeal(this);
  this.sealedAt = new Date();
  this.isTampered = false;
  this.tamperReason = '';
});

module.exports = mongoose.model('Attendance', attendanceSchema);
