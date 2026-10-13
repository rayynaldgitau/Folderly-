#!/bin/bash
# ==============================================================================
# Folderly – macOS Gatekeeper & Permissions Fixer
# ==============================================================================
# Resolves the macOS Gatekeeper warning:
#   "Folderly is damaged and can't be opened. You should move it to the Trash."
# or
#   "Folderly can't be opened because Apple cannot check it for malicious software."
#
# This occurs because open-source apps downloaded from the web have macOS
# quarantine flags (com.apple.quarantine) attached by Safari / Chrome.
# ==============================================================================

echo "=========================================================="
echo "🍎 Folderly – macOS Gatekeeper & Security Fixer"
echo "=========================================================="
echo ""

APP_PATH="/Applications/Folderly.app"
USER_APP_PATH="$HOME/Applications/Folderly.app"

TARGET=""
if [ -d "$APP_PATH" ]; then
    TARGET="$APP_PATH"
elif [ -d "$USER_APP_PATH" ]; then
    TARGET="$USER_APP_PATH"
else
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
    if [ -d "$SCRIPT_DIR/Folderly.app" ]; then
        TARGET="$SCRIPT_DIR/Folderly.app"
    fi
fi

if [ -z "$TARGET" ]; then
    echo "⚠️  Folderly.app was not found in /Applications."
    echo ""
    echo "Please ensure you have:"
    echo "  1. Opened the Folderly .dmg disk image."
    echo "  2. Dragged Folderly.app into your Applications folder."
    echo ""
    echo "Once dragged to /Applications, re-run this script!"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "Found Folderly at: $TARGET"
echo "Removing quarantine attributes..."
xattr -cr "$TARGET" 2>/dev/null || true

echo "Applying ad-hoc signature..."
codesign --force --deep --sign - "$TARGET" 2>/dev/null || true

echo ""
echo "✅ Success! Quarantine flags removed."
echo "🚀 Launching Folderly now..."
open "$TARGET"

echo ""
echo "Folderly is launched! You can close this Terminal window."
