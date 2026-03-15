#!/bin/bash
# Convert icon.svg to icon.icns for macOS
# Run this on a Mac (requires sips and iconutil which come with macOS)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_DIR/assets"
ICONSET_DIR="$ASSETS_DIR/icon.iconset"

# Check if we have the SVG
if [ ! -f "$ASSETS_DIR/icon.svg" ]; then
    echo "Error: assets/icon.svg not found. Run 'npm run generate-icon' first."
    exit 1
fi

# Convert SVG to PNG using sips (requires a PNG first - use qlmanage or rsvg-convert)
echo "Converting SVG to PNG..."

# Try rsvg-convert first (from librsvg, install via: brew install librsvg)
if command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w 1024 -h 1024 "$ASSETS_DIR/icon.svg" > "$ASSETS_DIR/icon.png"
# Try qlmanage as fallback (built into macOS)
elif command -v qlmanage &> /dev/null; then
    qlmanage -t -s 1024 -o "$ASSETS_DIR" "$ASSETS_DIR/icon.svg" 2>/dev/null
    mv "$ASSETS_DIR/icon.svg.png" "$ASSETS_DIR/icon.png" 2>/dev/null || true
else
    echo "Error: No SVG converter found. Install librsvg: brew install librsvg"
    exit 1
fi

if [ ! -f "$ASSETS_DIR/icon.png" ]; then
    echo "Error: Failed to create icon.png"
    exit 1
fi

echo "Creating iconset..."
mkdir -p "$ICONSET_DIR"

# Generate all required sizes
sips -z 16 16     "$ASSETS_DIR/icon.png" --out "$ICONSET_DIR/icon_16x16.png"
sips -z 32 32     "$ASSETS_DIR/icon.png" --out "$ICONSET_DIR/icon_16x16@2x.png"
sips -z 32 32     "$ASSETS_DIR/icon.png" --out "$ICONSET_DIR/icon_32x32.png"
sips -z 64 64     "$ASSETS_DIR/icon.png" --out "$ICONSET_DIR/icon_32x32@2x.png"
sips -z 128 128   "$ASSETS_DIR/icon.png" --out "$ICONSET_DIR/icon_128x128.png"
sips -z 256 256   "$ASSETS_DIR/icon.png" --out "$ICONSET_DIR/icon_128x128@2x.png"
sips -z 256 256   "$ASSETS_DIR/icon.png" --out "$ICONSET_DIR/icon_256x256.png"
sips -z 512 512   "$ASSETS_DIR/icon.png" --out "$ICONSET_DIR/icon_256x256@2x.png"
sips -z 512 512   "$ASSETS_DIR/icon.png" --out "$ICONSET_DIR/icon_512x512.png"
sips -z 1024 1024 "$ASSETS_DIR/icon.png" --out "$ICONSET_DIR/icon_512x512@2x.png"

echo "Creating .icns file..."
iconutil -c icns "$ICONSET_DIR" -o "$ASSETS_DIR/icon.icns"

# Cleanup
rm -rf "$ICONSET_DIR"

echo "Done! Created assets/icon.icns"
