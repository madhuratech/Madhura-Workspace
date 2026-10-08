const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/expo-notifications/build/warnOfExpoGoPushUsage.js');

if (fs.existsSync(filePath)) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('throw new Error(message);')) {
      content = content.replace(
        /if\s*\(\s*Platform\.OS\s*===\s*'android'\s*\)\s*\{\s*throw new Error\(message\);\s*\}\s*else if\s*\(__DEV__\)\s*\{\s*didWarn\s*=\s*true;\s*console\.warn\(message\);\s*\}/g,
        'didWarn = true; console.warn(message);'
      );
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('[patch-expo-notifications] Successfully patched warnOfExpoGoPushUsage.js');
    } else {
      console.log('[patch-expo-notifications] Already patched.');
    }
  } catch (err) {
    console.error('[patch-expo-notifications] Error patching file:', err.message);
  }
} else {
  console.log('[patch-expo-notifications] File not found, skipping.');
}
