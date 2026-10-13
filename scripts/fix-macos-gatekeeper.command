#!/bin/bash
# ==============================================================================
# Foldy – macOS Gatekeeper & Permissions Fixer
# ==============================================================================
# Resolves the macOS Gatekeeper warning:
#   "Foldy is damaged and can't be opened. You should move it to the Trash."
# or
#   "Foldy can't be opened because Apple cannot check it for malicious software."
#
# This occurs because open-source apps downloaded from the web have macOS
# quarantine flags (com.apple.quarantine) attached by Safari / Chrome.
# ==============================================================================

echo "=========================================================="
echo "🍎 Foldy – macOS Gatekeeper & Security Fixer"
echo "=========================================================="
echo ""

APP_PATH="/Applications/Foldy.app"
USER_APP_PATH="$HOME/Applications/Foldy.app"

TARGET=""
if [ -d "$APP_PATH" ]; then
    TARGET="$APP_PATH"
elif [ -d "$USER_APP_PATH" ]; then
    TARGET="$USER_APP_PATH"
else
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
    if [ -d "$SCRIPT_DIR/Foldy.app" ]; then
        TARGET="$SCRIPT_DIR/Foldy.app"
    fi
fi

if [ -z "$TARGET" ]; then
    echo "⚠️  Foldy.app was not found in /Applications."
    echo ""
    echo "Please ensure you have:"
    echo "  1. Opened the Foldy .dmg disk image."
    echo "  2. Dragged Foldy.app into your Applications folder."
    echo ""
    echo "Once dragged to /Applications, re-run this script!"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "Found Foldy at: $TARGET"
echo "Removing quarantine attributes..."
xattr -cr "$TARGET" 2>/dev/null || true

echo "Applying ad-hoc signature..."
codesign --force --deep --sign - "$TARGET" 2>/dev/null || true

echo ""
echo "✅ Success! Quarantine flags removed."
echo "🚀 Launching Foldy now..."
open "$TARGET"

echo ""
echo "Foldy is launched! You can close this Terminal window."
