const crypto = require('crypto');

// Secret key for AES-256 encryption derived from ENCRYPTION_KEY / JWT_SECRET
const SECRET = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'madhura-workspace-default-secret-key-2026';
const ALGORITHM = 'aes-256-cbc';
const PREFIX = 'enc:';

// Generate 32-byte key from SECRET
const KEY = crypto.createHash('sha256').update(String(SECRET)).digest();

/**
 * Encrypt plain text before storing in MongoDB
 * Result format in database: "enc:<iv_hex>:<ciphertext_hex>"
 */
function encryptText(text) {
  if (!text || typeof text !== 'string') return text;
  if (text.startsWith(PREFIX)) return text; // already encrypted

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${PREFIX}${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return text;
  }
}

/**
 * Decrypt cipher text retrieved from MongoDB
 * Gracefully handles legacy unencrypted plain text
 */
function decryptText(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;
  if (!cipherText.startsWith(PREFIX)) return cipherText; // legacy plain text

  try {
    const parts = cipherText.slice(PREFIX.length).split(':');
    if (parts.length !== 2) return cipherText;

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return cipherText;
  }
}

module.exports = {
  encryptText,
  decryptText
};
