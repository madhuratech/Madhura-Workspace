const express = require('express');
const router = express.Router({ mergeParams: true });
const Attendance = require('../models/Attendance');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { sendNotification } = require('../controllers/notificationController');
const { verifyAttendanceSeal, generateAttendanceSeal, recoverFromVault } = require('../utils/attendanceSecurity');

// ── Date & Time Helpers (Asia/Kolkata IST) ──────────────────────────────────
const getISTDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
};

const getShiftDateTime = (dateStr, timeStr = '18:00') => {
  const [hStr, mStr] = (timeStr || '18:00').split(':');
  const hh = (parseInt(hStr, 10) || 18).toString().padStart(2, '0');
  const mm = (parseInt(mStr, 10) || 0).toString().padStart(2, '0');
  return new Date(`${dateStr}T${hh}:${mm}:00+05:30`);
};

// ── Auto-checkout runner for active records past shift end time ─────────────
const autoCheckOutPendingRecords = async (io = null) => {
  try {
    const now = new Date();
    const pendingRecords = await Attendance.find({
      checkOut: null,
      status: 'Present'
    }).populate('user', 'name email designation shiftStartTime shiftEndTime');

    for (const record of pendingRecords) {
      if (!record.user) continue;
      const userShiftEnd = record.user.shiftEndTime || '18:00';
      const shiftEndDate = getShiftDateTime(record.date, userShiftEnd);
      
      // Auto-checkout occurs when current time reaches the employee's scheduled shift end time
      if (now >= shiftEndDate) {
        record.checkOut = shiftEndDate;
        record.isAutoCheckOut = true;
        await record.save();

        if (io) {
          io.emit('attendance_updated', {
            userId: record.user._id,
            workspaceId: record.workspace,
            recordId: record._id,
            checkOut: record.checkOut,
            isAutoCheckOut: true,
            date: record.date
          });
        }
      }
    }
  } catch (error) {
    console.error('Error auto-checking out pending records:', error);
  }
};

router.use(protect);

// ── Get attendance records ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    // Check workspace membership
    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    
    const member = workspace.members.find(m => m.user && m.user._id.toString() === req.user._id.toString());
    if (!member) return res.status(403).json({ message: 'Access denied' });

    // Auto-checkout any expired shift records before returning
    await autoCheckOutPendingRecords(req.io);

    let filter = { workspace: workspaceId };
    
    // Employees and TLs can only see their own attendance
    if (member.role === 'employee' || member.role === 'team_leader') {
      filter.user = req.user._id;
    }

    const records = await Attendance.find(filter)
      .populate('user', 'name email designation shiftStartTime shiftEndTime avatar')
      .populate('overtimeApprovedBy', 'name email designation role')
      .sort({ date: -1 });

    // Process records: handle auto-shift corrections and verify cryptographic seals
    const verifiedRecords = [];
    for (const record of records) {
      if (record.isAutoCheckOut && record.user && record.checkOut) {
        const userShiftEnd = record.user.shiftEndTime || '18:00';
        const expectedShiftEnd = getShiftDateTime(record.date, userShiftEnd);
        if (new Date(record.checkOut).getTime() > expectedShiftEnd.getTime()) {
          record.checkOut = expectedShiftEnd;
          await record.save();
        }
      }

      // Cryptographic HMAC Verification:
      // Detects if anyone accessed MongoDB directly (via MongoDB Atlas or Compass) and modified records
      const verification = verifyAttendanceSeal(record);
      const recordObj = record.toObject();

      if (verification.isSealed && !verification.isValid) {
        recordObj.isTampered = true;
        recordObj.tamperReason = '⚠️ Security Alert: Cryptographic signature mismatch! Direct modification in MongoDB Cloud detected.';

        // ── Self-Healing Auto-Revert: Restore authentic state from AES-256 Vault ──
        const vault = recoverFromVault(record.encryptedVault);
        if (vault && vault.checkIn) {
          const originalCheckIn = new Date(vault.checkIn);
          const currentCheckIn = record.checkIn ? new Date(record.checkIn) : null;
          const wasCheckInAltered = !currentCheckIn || currentCheckIn.getTime() !== originalCheckIn.getTime();
          const wasLateAltered = record.isLate !== vault.isLate || record.lateMinutes !== vault.lateMinutes;

          if (wasCheckInAltered || wasLateAltered) {
            console.warn(`[SECURITY] Auto-reverting tampered MongoDB record for user ${record.user?._id || record.user} on date ${record.date}`);
            
            // Revert record values in memory
            recordObj.checkIn = originalCheckIn;
            recordObj.isLate = vault.isLate;
            recordObj.lateMinutes = vault.lateMinutes;
            recordObj.status = vault.status || recordObj.status;
            recordObj.tamperReason = `⚠️ Unauthorized MongoDB Cloud edit reverted back to real punch-in (${originalCheckIn.toLocaleTimeString('en-US')}).`;

            // Overwrite tampered data in MongoDB with real original values
            Attendance.updateOne(
              { _id: record._id },
              {
                checkIn: originalCheckIn,
                isLate: vault.isLate,
                lateMinutes: vault.lateMinutes,
                status: vault.status || record.status,
                isTampered: true,
                tamperReason: recordObj.tamperReason
              }
            ).catch(err => console.error('Failed to auto-revert tampered record in DB:', err));
          }
        }

        // Log high-severity audit log for administrative visibility
        AuditLog.create({
          workspace: record.workspace,
          user: record.user?._id || record.user,
          action: 'ATTENDANCE_TAMPER_DETECTED',
          entityType: 'Attendance',
          entityId: record._id,
          details: `Direct MongoDB Cloud modification detected for ${record.user?.name || record.user} on ${record.date}. Expected seal: ${verification.expected?.slice(0, 8)}..., Stored seal: ${verification.actual?.slice(0, 8)}... Action: Automatically reverted to encrypted vault backup.`,
          metadata: {
            recordId: record._id,
            date: record.date,
            expectedSeal: verification.expected,
            storedSeal: verification.actual
          }
        }).catch(err => console.error('Failed to log attendance tamper event:', err));
      } else {
        recordObj.isTampered = false;
        recordObj.isSealed = verification.isSealed;
      }

      verifiedRecords.push(recordObj);
    }

    res.json(verifiedRecords);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Seal legacy unsealed records (HR / Super Admin only) ────────────────────
router.post('/seal-legacy', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const member = workspace.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    const isMDorHR = req.user.role === 'super_admin' || req.user.role === 'hr' ||
                     (member && ['super_admin', 'hr'].includes(member.role));

    if (!isMDorHR) {
      return res.status(403).json({ message: 'Access denied: Only Super Admin and HR can seal legacy records.' });
    }

    const unsealedRecords = await Attendance.find({
      workspace: workspaceId,
      $or: [{ tamperSeal: null }, { tamperSeal: { $exists: false } }]
    });

    let sealedCount = 0;
    for (const record of unsealedRecords) {
      await record.save();
      sealedCount++;
    }

    res.json({
      message: `Successfully applied cryptographic tamper seals to ${sealedCount} legacy attendance records.`,
      sealedCount
    });
  } catch (error) {
    console.error('Error sealing legacy records:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Check in (Login) ────────────────────────────────────────────────────────
router.post('/checkin', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const now = new Date();
    const dateStr = getISTDateString(now);

    const existing = await Attendance.findOne({ workspace: workspaceId, user: req.user._id, date: dateStr });
    if (existing) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    // Calculate Late based on employee's custom shiftStartTime (defaults to 09:40 AM IST)
    let isLate = false;
    let lateMinutes = 0;
    
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istString);
    const checkInHour = istDate.getHours();
    const checkInMinute = istDate.getMinutes();

    const userShiftStart = req.user.shiftStartTime || '09:40';
    const [startHourStr, startMinStr] = userShiftStart.split(':');
    const targetStartHour = parseInt(startHourStr, 10) || 9;
    const targetStartMin = parseInt(startMinStr, 10) || 40;

    const totalCheckInMinutes = checkInHour * 60 + checkInMinute;
    const totalShiftStartMinutes = targetStartHour * 60 + targetStartMin;

    if (totalCheckInMinutes > totalShiftStartMinutes) {
      isLate = true;
      lateMinutes = totalCheckInMinutes - totalShiftStartMinutes;
    }

    const record = new Attendance({
      workspace: workspaceId,
      user: req.user._id,
      date: dateStr,
      checkIn: now,
      status: 'Present',
      isLate,
      lateMinutes
    });

    await record.save();
    
    // Notify HR and Super Admins (MD)
    try {
      const admins = await User.find({ role: { $in: ['super_admin', 'hr'] } }).select('_id');
      for (const admin of admins) {
        if (admin._id.toString() !== req.user._id.toString()) {
          let lateString = '';
          if (isLate) {
            const h = Math.floor(lateMinutes / 60);
            const m = lateMinutes % 60;
            if (h > 0 && m > 0) lateString = ` (Late by ${h} hour ${m} mins based on ${userShiftStart} shift)`;
            else if (h > 0) lateString = ` (Late by ${h} hour based on ${userShiftStart} shift)`;
            else lateString = ` (Late by ${m} mins based on ${userShiftStart} shift)`;
          }

          await sendNotification(
            req,
            admin._id,
            'general',
            'Employee Punched In',
            `${req.user.name} has punched in${lateString}.`,
            `/attendance`
          );
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify admins for checkin:', notifErr);
    }

    if (req.io) {
      req.io.emit('attendance_updated', record);
    }

    res.status(201).json(record);
  } catch (error) {
    console.error('Error during checkin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Check out (Logout) ──────────────────────────────────────────────────────
router.put('/checkout', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const now = new Date();
    const dateStr = getISTDateString(now);

    const record = await Attendance.findOne({ workspace: workspaceId, user: req.user._id, date: dateStr });
    if (!record) {
      return res.status(400).json({ message: 'No check-in found for today' });
    }

    const userShiftEnd = req.user.shiftEndTime || '18:00';
    const shiftEndDate = getShiftDateTime(dateStr, userShiftEnd);

    // If already checked out (e.g. auto checked out at shift end time)
    if (record.checkOut) {
      return res.status(200).json({ 
        message: `Shift completed. Checked out at your shift time (${userShiftEnd}). Overtime must be entered by MD/HR.`,
        record 
      });
    }

    // Check early leave based on employee's custom shiftEndTime (defaults to 18:00 IST)
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istString);
    const checkOutHour = istDate.getHours();
    const checkOutMinute = istDate.getMinutes();

    const [endHourStr, endMinStr] = userShiftEnd.split(':');
    const targetEndHour = parseInt(endHourStr, 10) || 18;
    const targetEndMin = parseInt(endMinStr, 10) || 0;

    const totalCheckOutMinutes = checkOutHour * 60 + checkOutMinute;
    const totalShiftEndMinutes = targetEndHour * 60 + targetEndMin;
    
    // If it's before shift end time and they haven't been approved for early leave
    if (totalCheckOutMinutes < totalShiftEndMinutes && !record.earlyLeaveApproved) {
      return res.status(400).json({ 
        message: `It is before your shift end time (${userShiftEnd}). Please request early leave permission first.`,
        requiresEarlyLeave: true 
      });
    }

    // If checking out at or after shift end time, checkOut is automatically set to shiftEndTime
    if (totalCheckOutMinutes >= totalShiftEndMinutes) {
      record.checkOut = shiftEndDate;
      record.isAutoCheckOut = true;
    } else {
      record.checkOut = now;
      record.isEarlyLeave = true;
    }

    await record.save();

    if (req.io) {
      req.io.emit('attendance_updated', record);
    }

    res.json(record);
  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Overtime: Entered & Managed by MD (super_admin) and HR ──────────────────
router.post('/overtime', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { userId, date, overtimeMinutes, overtimeHours, reason } = req.body;

    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const currentMember = workspace.members.find(m => m.user && m.user._id.toString() === req.user._id.toString());
    const isMDorHR = req.user.role === 'super_admin' || req.user.role === 'hr' || 
                     (currentMember && ['super_admin', 'hr'].includes(currentMember.role));

    if (!isMDorHR) {
      return res.status(403).json({ message: 'Access denied: Only Managing Director (MD) and HR can enter overtime.' });
    }

    if (!userId || !date) {
      return res.status(400).json({ message: 'Employee and date are required.' });
    }

    const employee = await User.findById(userId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const totalMinutes = Number(overtimeMinutes) || Math.round(Number(overtimeHours) * 60) || 0;
    if (totalMinutes <= 0) {
      return res.status(400).json({ message: 'Please enter overtime duration greater than 0 minutes.' });
    }

    const calculatedHours = +(totalMinutes / 60).toFixed(2);
    const userShiftEnd = employee.shiftEndTime || '18:00';
    const shiftEndDate = getShiftDateTime(date, userShiftEnd);

    let record = await Attendance.findOne({ workspace: workspaceId, user: userId, date });
    if (!record) {
      const userShiftStart = employee.shiftStartTime || '09:40';
      const shiftStartDate = getShiftDateTime(date, userShiftStart);
      record = new Attendance({
        workspace: workspaceId,
        user: userId,
        date,
        status: 'Present',
        checkIn: shiftStartDate,
        checkOut: shiftEndDate,
        isAutoCheckOut: true,
        overtimeMinutes: totalMinutes,
        overtimeHours: calculatedHours,
        overtimeReason: reason || 'Overtime entered by MD/HR',
        overtimeApprovedBy: req.user._id,
        overtimeApprovedAt: new Date()
      });
    } else {
      record.overtimeMinutes = totalMinutes;
      record.overtimeHours = calculatedHours;
      record.overtimeReason = reason || record.overtimeReason || 'Overtime entered by MD/HR';
      record.overtimeApprovedBy = req.user._id;
      record.overtimeApprovedAt = new Date();
      // Keep checkOut as the actual shift end time for auto checkouts
      if (!record.checkOut || record.isAutoCheckOut) {
        record.checkOut = shiftEndDate;
        record.isAutoCheckOut = true;
      }
    }

    await record.save();
    await record.populate('user', 'name email designation shiftStartTime shiftEndTime avatar');
    await record.populate('overtimeApprovedBy', 'name email designation role');

    // Notify employee of recorded overtime
    try {
      const roleTitle = (req.user.role === 'super_admin' || currentMember?.role === 'super_admin') ? 'Managing Director (MD)' : 'HR';
      await sendNotification(
        req,
        userId,
        'general',
        'Overtime Approved & Logged',
        `${roleTitle} (${req.user.name}) recorded ${calculatedHours} hr(s) of overtime for you on ${date}. Reason: ${reason || 'Approved overtime'}.`,
        '/attendance'
      );
    } catch (notifErr) {
      console.error('Failed to notify employee about overtime:', notifErr);
    }

    if (req.io) {
      req.io.emit('attendance_updated', record);
    }

    res.status(200).json({
      message: 'Overtime recorded successfully',
      record
    });
  } catch (error) {
    console.error('Error entering overtime:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Overtime: Delete / Reset by MD and HR ───────────────────────────────────
router.delete('/:recordId/overtime', async (req, res) => {
  try {
    const { workspaceId, recordId } = req.params;

    const workspace = await Workspace.findById(workspaceId).populate('members.user');
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const currentMember = workspace.members.find(m => m.user && m.user._id.toString() === req.user._id.toString());
    const isMDorHR = req.user.role === 'super_admin' || req.user.role === 'hr' || 
                     (currentMember && ['super_admin', 'hr'].includes(currentMember.role));

    if (!isMDorHR) {
      return res.status(403).json({ message: 'Access denied: Only Managing Director (MD) and HR can modify overtime.' });
    }

    const record = await Attendance.findById(recordId).populate('user', 'shiftEndTime');
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });

    const userShiftEnd = record.user?.shiftEndTime || '18:00';
    const shiftEndDate = getShiftDateTime(record.date, userShiftEnd);

    record.overtimeMinutes = 0;
    record.overtimeHours = 0;
    record.overtimeReason = '';
    record.overtimeApprovedBy = null;
    record.overtimeApprovedAt = null;
    record.checkOut = shiftEndDate;
    await record.save();

    if (req.io) {
      req.io.emit('attendance_updated', record);
    }

    res.json({ message: 'Overtime removed successfully', record });
  } catch (error) {
    console.error('Error removing overtime:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.autoCheckOutPendingRecords = autoCheckOutPendingRecords;

module.exports = router;
