#!/usr/bin/env bash
# ==============================================================================
# Folderly – macOS Build & Installer Generation Script
# ==============================================================================
# This script compiles the frontend, builds the Rust binary, and packages
# a native macOS `.dmg` (Disk Image) installer and `.app` bundle.
#
# Usage:
#   chmod +x build-mac.sh
#   ./build-mac.sh
# ==============================================================================

set -e

echo "🍎 [Folderly] Preparing macOS Installer Build..."

# 1. Verify Rust installation
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust (cargo) is not installed. Please install it from https://rustup.rs"
    exit 1
fi

# 2. Verify Node.js installation
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js (npm) is not installed. Please install Node.js 18+."
    exit 1
fi

echo "📦 Installing npm dependencies..."
npm install

echo "🔧 Adding Apple Silicon & Intel Darwin compilation targets..."
rustup target add aarch64-apple-darwin x86_64-apple-darwin 2>/dev/null || true

echo "🔨 Compiling Universal macOS DMG and App Bundle (supports both Intel & Apple Silicon)..."
if npx tauri build --target universal-apple-darwin; then
    echo "✅ Successfully built Universal macOS binary and DMG!"
else
    echo "⚠️ Universal target build encountered an issue, building native host architecture..."
    npm run tauri build
fi

echo "🔏 Ad-hoc code signing generated .app bundles..."
find src-tauri/target -name "Folderly.app" -type d -exec codesign --force --deep --sign - {} \; 2>/dev/null || true

echo ""
echo "✅ Build complete!"
echo "📁 Your macOS installer (.dmg) is located at:"
find src-tauri/target -name "*.dmg" -type f 2>/dev/null
echo ""
echo "💡 Note: If macOS Gatekeeper shows 'Folderly is damaged and can't be opened' after installing,"
echo "simply run: xattr -cr /Applications/Folderly.app"
echo ""
