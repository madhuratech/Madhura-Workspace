const crypto = require('crypto');

// Secret key for HMAC signing, falls back to JWT_SECRET or a dedicated fallback
const HMAC_SECRET = process.env.ATTENDANCE_HMAC_SECRET || process.env.JWT_SECRET || 'madhura-attendance-anti-tamper-key-2026';

/**
 * Extracts a normalized string ID from an ObjectId, object, or string
 */
function extractId(val) {
  if (!val) return '';
  if (typeof val === 'object' && val._id) return String(val._id);
  return String(val);
}

/**
 * Normalizes date to ISO string for deterministic hashing
 */
function normalizeDateStr(val) {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toISOString();
}

/**
 * Builds a canonical string representation of critical attendance fields
 * Format: workspace|user|date|checkIn|checkOut|status|isLate|lateMinutes|isEarlyLeave|overtimeMinutes|overtimeApprovedBy
 */
function buildCanonicalPayload(doc) {
  const workspaceId = extractId(doc.workspace);
  const userId = extractId(doc.user);
  const date = doc.date ? String(doc.date).trim() : '';
  const checkIn = normalizeDateStr(doc.checkIn);
  const checkOut = normalizeDateStr(doc.checkOut);
  const status = doc.status ? String(doc.status).trim() : 'Present';
  const isLate = Boolean(doc.isLate) ? '1' : '0';
  const lateMinutes = Number(doc.lateMinutes) || 0;
  const isEarlyLeave = Boolean(doc.isEarlyLeave) ? '1' : '0';
  const overtimeMinutes = Number(doc.overtimeMinutes) || 0;
  const overtimeApprovedBy = extractId(doc.overtimeApprovedBy);

  return [
    workspaceId,
    userId,
    date,
    checkIn,
    checkOut,
    status,
    isLate,
    lateMinutes,
    isEarlyLeave,
    overtimeMinutes,
    overtimeApprovedBy
  ].join('|');
}

/**
 * Computes a SHA-256 HMAC digital seal over the canonical payload
 */
function generateAttendanceSeal(doc) {
  const payload = buildCanonicalPayload(doc);
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

/**
 * Verifies if an attendance record's cryptographic seal matches its current database contents
 */
function verifyAttendanceSeal(doc) {
  if (!doc) {
    return { isSealed: false, isValid: false, reason: 'no_document' };
  }

  // Legacy records created prior to HMAC seal implementation
  if (!doc.tamperSeal) {
    return { isSealed: false, isValid: true, reason: 'legacy_unsealed' };
  }

  const expectedSeal = generateAttendanceSeal(doc);
  const actualBuffer = Buffer.from(String(doc.tamperSeal), 'hex');
  const expectedBuffer = Buffer.from(expectedSeal, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) {
    return {
      isSealed: true,
      isValid: false,
      reason: 'length_mismatch',
      expected: expectedSeal,
      actual: doc.tamperSeal
    };
  }

  const match = crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  return {
    isSealed: true,
    isValid: match,
    reason: match ? 'verified_authentic' : 'tampering_detected',
    expected: expectedSeal,
    actual: doc.tamperSeal
  };
}

module.exports = {
  buildCanonicalPayload,
  generateAttendanceSeal,
  verifyAttendanceSeal
};
