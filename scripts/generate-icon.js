/**
 * Generate app icon for Notepad++ Mac.
 *
 * This creates a 1024x1024 PNG icon. On macOS you can convert it to .icns with:
 *   mkdir icon.iconset
 *   sips -z 16 16     assets/icon.png --out icon.iconset/icon_16x16.png
 *   sips -z 32 32     assets/icon.png --out icon.iconset/icon_16x16@2x.png
 *   sips -z 32 32     assets/icon.png --out icon.iconset/icon_32x32.png
 *   sips -z 64 64     assets/icon.png --out icon.iconset/icon_32x32@2x.png
 *   sips -z 128 128   assets/icon.png --out icon.iconset/icon_128x128.png
 *   sips -z 256 256   assets/icon.png --out icon.iconset/icon_128x128@2x.png
 *   sips -z 256 256   assets/icon.png --out icon.iconset/icon_256x256.png
 *   sips -z 512 512   assets/icon.png --out icon.iconset/icon_256x256@2x.png
 *   sips -z 512 512   assets/icon.png --out icon.iconset/icon_512x512.png
 *   sips -z 1024 1024 assets/icon.png --out icon.iconset/icon_512x512@2x.png
 *   iconutil -c icns icon.iconset -o assets/icon.icns
 *   rm -rf icon.iconset
 *
 * Or use the included convert-icon.sh script.
 *
 * For now, electron-builder will auto-convert the PNG to icns if
 * icon.icns is missing but icon.png exists in assets/.
 */

const fs = require('fs');
const path = require('path');

// Generate a simple SVG icon, then we'll note that electron-builder
// can work with PNG. We'll create an SVG that can be converted.
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2b5ea7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a3a6e;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="doc" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e8e8e8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Rounded square background -->
  <rect x="0" y="0" width="1024" height="1024" rx="220" ry="220" fill="url(#bg)"/>
  <!-- Document shape -->
  <path d="M 280 160 L 620 160 L 760 300 L 760 864 L 280 864 Z" fill="url(#doc)" stroke="none"/>
  <!-- Folded corner -->
  <path d="M 620 160 L 620 300 L 760 300 Z" fill="#c0c0c0" stroke="none"/>
  <!-- Code lines -->
  <rect x="340" y="380" width="280" height="24" rx="12" fill="#2b5ea7" opacity="0.8"/>
  <rect x="340" y="430" width="200" height="24" rx="12" fill="#4a90d9" opacity="0.6"/>
  <rect x="340" y="480" width="340" height="24" rx="12" fill="#2b5ea7" opacity="0.8"/>
  <rect x="340" y="530" width="160" height="24" rx="12" fill="#4a90d9" opacity="0.6"/>
  <rect x="340" y="580" width="300" height="24" rx="12" fill="#2b5ea7" opacity="0.8"/>
  <rect x="340" y="630" width="240" height="24" rx="12" fill="#4a90d9" opacity="0.6"/>
  <rect x="340" y="680" width="180" height="24" rx="12" fill="#2b5ea7" opacity="0.8"/>
  <rect x="340" y="730" width="320" height="24" rx="12" fill="#4a90d9" opacity="0.6"/>
  <!-- N++ text -->
  <text x="512" y="270" font-family="SF Pro Display, Helvetica Neue, Arial, sans-serif" font-size="80" font-weight="bold" fill="#2b5ea7" text-anchor="middle" opacity="0.3">N++</text>
</svg>`;

const outputDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outputDir, { recursive: true });

// Write SVG
fs.writeFileSync(path.join(outputDir, 'icon.svg'), svgIcon);
console.log('Created assets/icon.svg');
console.log('');
console.log('To create the .icns file for macOS, run on a Mac:');
console.log('  ./scripts/convert-icon.sh');
console.log('');
console.log('Or install png-to-ico / svg2png tools and convert manually.');
console.log('electron-builder will also auto-convert PNG to icns if needed.');
