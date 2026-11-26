const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '../node_modules/expo-notifications/build');

if (fs.existsSync(baseDir)) {
  try {
    // 1. Completely neutralize warnOfExpoGoPushUsage.js
    const warnPath = path.join(baseDir, 'warnOfExpoGoPushUsage.js');
    if (fs.existsSync(warnPath)) {
      fs.writeFileSync(warnPath, 'export const warnOfExpoGoPushUsage = () => {};\n', 'utf8');
      console.log('[patch] neutralized warnOfExpoGoPushUsage.js');
    }

    // 2. Remove warnOfExpoGoPushUsage() calls in TokenEmitter.js
    const tokenEmitterPath = path.join(baseDir, 'TokenEmitter.js');
    if (fs.existsSync(tokenEmitterPath)) {
      let content = fs.readFileSync(tokenEmitterPath, 'utf8');
      content = content.replace(/warnOfExpoGoPushUsage\(\);?/g, '// warnOfExpoGoPushUsage neutralized');
      fs.writeFileSync(tokenEmitterPath, content, 'utf8');
      console.log('[patch] neutralized TokenEmitter.js');
    }

    // 3. Remove warnOfExpoGoPushUsage() calls in getDevicePushTokenAsync.js
    const deviceTokenPath = path.join(baseDir, 'getDevicePushTokenAsync.js');
    if (fs.existsSync(deviceTokenPath)) {
      let content = fs.readFileSync(deviceTokenPath, 'utf8');
      content = content.replace(/warnOfExpoGoPushUsage\(\);?/g, '// warnOfExpoGoPushUsage neutralized');
      fs.writeFileSync(deviceTokenPath, content, 'utf8');
      console.log('[patch] neutralized getDevicePushTokenAsync.js');
    }

    // 4. Remove warnOfExpoGoPushUsage() calls in topicSubscription.js
    const topicPath = path.join(baseDir, 'topicSubscription.js');
    if (fs.existsSync(topicPath)) {
      let content = fs.readFileSync(topicPath, 'utf8');
      content = content.replace(/warnOfExpoGoPushUsage\(\);?/g, '// warnOfExpoGoPushUsage neutralized');
      fs.writeFileSync(topicPath, content, 'utf8');
      console.log('[patch] neutralized topicSubscription.js');
    }

    // 5. Protect DevicePushTokenAutoRegistration.fx.js from throwing in Expo Go
    const fxPath = path.join(baseDir, 'DevicePushTokenAutoRegistration.fx.js');
    if (fs.existsSync(fxPath)) {
      let content = fs.readFileSync(fxPath, 'utf8');
      if (!content.includes('// EXPO_GO_SAFEGUARD')) {
        content = `// EXPO_GO_SAFEGUARD\ntry {\n${content}\n} catch(err) { console.warn('[expo-notifications] Suppressed auto-reg in Expo Go:', err.message); }\n`;
        fs.writeFileSync(fxPath, content, 'utf8');
        console.log('[patch] safeguarded DevicePushTokenAutoRegistration.fx.js');
      }
    }

    console.log('[patch-expo-notifications] All expo-notifications patches applied successfully.');
  } catch (err) {
    console.error('[patch-expo-notifications] Error patching files:', err.message);
  }
} else {
  console.log('[patch-expo-notifications] Directory not found, skipping.');
}
