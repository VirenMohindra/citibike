/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(path.join(__dirname, '../public/icon.svg'));

  console.log('Generating PWA icons...');

  for (const size of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, `../public/icon-${size}x${size}.png`));

      console.log(`✓ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}x${size}.png:`, error.message);
    }
  }

  // Generate favicon
  try {
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'));
    console.log('✓ Generated favicon.png');
  } catch (error) {
    console.error('✗ Failed to generate favicon.png:', error.message);
  }

  // Generate apple-touch-icon
  try {
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
    console.log('✓ Generated apple-touch-icon.png');
  } catch (error) {
    console.error('✗ Failed to generate apple-touch-icon.png:', error.message);
  }

  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
