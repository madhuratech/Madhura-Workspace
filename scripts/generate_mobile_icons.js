const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateIcons() {
  const sourceLogo = path.join(__dirname, '../client/public/Madhura-logo.webp');
  const fallbackLogo = path.join(__dirname, '../mobile/assets/logo.jpeg');
  const inputLogo = fs.existsSync(sourceLogo) ? sourceLogo : fallbackLogo;
  
  const assetsDir = path.join(__dirname, '../mobile/assets');

  console.log('Generating mobile icons using:', inputLogo);

  // 1. icon.png (1024x1024 for iOS & standard Android)
  const logoBuffer = await sharp(inputLogo)
    .resize(768, 768, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  // 2. android-icon-foreground.png (1024x1024 adaptive foreground with padding so it isn't clipped)
  const adaptiveLogoBuffer = await sharp(inputLogo)
    .resize(560, 560, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  })
    .composite([{ input: adaptiveLogoBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, 'android-icon-foreground.png'));

  // 3. android-icon-background.png (1024x1024 solid white background)
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .png()
    .toFile(path.join(assetsDir, 'android-icon-background.png'));

  // 4. splash-icon.png (512x512)
  await sharp(inputLogo)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));

  // 5. favicon.png (48x48)
  await sharp(inputLogo)
    .resize(48, 48, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));

  console.log('All mobile icons generated successfully with Madhura Workspace logo!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
