const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/expo-notifications/build/warnOfExpoGoPushUsage.js');

if (fs.existsSync(filePath)) {
  try {
    fs.writeFileSync(
      filePath,
      'export const warnOfExpoGoPushUsage = () => {};\n',
      'utf8'
    );
    console.log('[patch-expo-notifications] Successfully neutralized warnOfExpoGoPushUsage.js');
  } catch (err) {
    console.error('[patch-expo-notifications] Error patching file:', err.message);
  }
} else {
  console.log('[patch-expo-notifications] File not found, skipping.');
}
