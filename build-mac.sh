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

echo "🔨 Compiling frontend and bundling macOS app (.dmg & .app)..."
npm run tauri build

echo ""
echo "✅ Build complete!"
echo "📁 Your macOS installer (.dmg) is located at:"
ls -lh src-tauri/target/release/bundle/dmg/*.dmg 2>/dev/null || echo "Check src-tauri/target/release/bundle/"
echo ""
echo "You can double-click the .dmg file to mount and drag Folderly to /Applications."
