# Foldy

> A cute, visual File Explorer and bulk-renamer desktop app built with Tauri 2, Rust, React, TypeScript, and Tailwind CSS.

[![Download for macOS](https://img.shields.io/badge/Download_for_macOS-.dmg-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/rayynaldgitau/Folderly-/releases/latest)
[![Download for Windows](https://img.shields.io/badge/Download_for_Windows-.exe%20%2F%20.msi-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/rayynaldgitau/Folderly-/releases/latest)
[![Latest Release](https://img.shields.io/github/v/release/rayynaldgitau/Folderly-?style=for-the-badge&color=ff2d87)](https://github.com/rayynaldgitau/Folderly-/releases/latest)

---

## 📥 Downloads

| Platform | Installer Type | Direct Download Link |
|---|---|---|
| **macOS** (Apple Silicon & Intel) | `.dmg` Disk Image (Universal) | [**Download Foldy.dmg**](https://github.com/rayynaldgitau/Folderly-/releases/latest) |
| **macOS** (1-Click Fixer) | `.command` Helper Script | [**Download fix-macos-gatekeeper.command**](https://github.com/rayynaldgitau/Folderly-/releases/latest) |
| **Windows** (10 / 11) | `.msi` Windows Installer | [**Download Foldy.msi**](https://github.com/rayynaldgitau/Folderly-/releases/latest) |
| **Windows** (10 / 11) | `.exe` Setup Executable | [**Download Foldy Setup.exe**](https://github.com/rayynaldgitau/Folderly-/releases/latest) |

> [!IMPORTANT]
> **macOS Notice ("Foldy is damaged and can't be opened"):**
> Because Foldy is an open-source app and not signed with a paid Apple Developer ID, macOS Gatekeeper blocks web downloads by default.
> 
> **To open Foldy:**
> 1. Drag **Foldy.app** from the `.dmg` into `/Applications`.
> 2. Run in **Terminal**: `xattr -cr /Applications/Foldy.app` (or double-click `fix-macos-gatekeeper.command`).
> 3. Open Foldy normally!

---

## Key Features & Safety

- **Quick Look Preview (`P` or `Space`)**: Instant macOS/Windows style preview for photos, videos, audio waveforms, formatted code with line numbers, PDFs, and folder contents with arrow-key navigation.
- **5 Lovable Themes**:
  - 🌸 **Midnight Sakura (OLED)**: Deep OLED obsidian black with neon rose highlights.
  - 🍬 **Blush Cotton Candy**: Soft pastel cashmere velvet with strawberry accents.
  - 🌐 **Google Pixel Horizon**: Authentic Material You with Google Blue & Android Emerald.
  - 🍎 **Cupertino Silver & Multicolor**: Classic brushed aluminum with Apple Multicolor vibrancy.
  - 🌅 **Solar Sunset (Matte Orange)**: Deep matte black ignited by glowing amber sunset accents.
- **Interactive In-App Tutorials**: Built-in 6-stage walkthrough guide, keyboard shortcuts cheat sheet, and onboarding tour (`TutorialModal.tsx`).
- **Automatic "What's New" Pop-Up**: Automatically surfaces release highlights and major new features whenever a new update is installed on macOS or Windows (`WhatsNewModal.tsx`).
- **Tabbed Browsing**: Modern browser-style tab strip (`Ctrl+T`, `Ctrl+W`) with drag & drop support.
- **Universal Laptop Search**: Spotlight-style command palette (`Ctrl+K`) searching across your entire PC.
- **Safe Bulk Renamer & 1-Click Undo**: Rule builder, collision detection preview before touching disk, and transactional session undo ledger.
- **Safety & ISO/IEC 25010 Compliance**:
  - Protected OS directory guards: Prohibits accidental deletion of root drives (`C:\`, `/`) and system directories (`Windows`, `Program Files`, `/System`, etc.).
  - Command injection immunity: Safe `ShellExecuteW` and argument isolation.
  - Strict Content Security Policy (CSP): Tauri v2 hardened sandbox with zero remote script execution.
  - 100% Offline & Private: Zero telemetry, zero tracking, local filesystem only.

---

## How to Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (hot-reloads React + native window)
npm run tauri dev

# 3. Build standalone executable & installers
npm run tauri build

# 4. Run tests & quality assurance verification
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
```

### Environment Variables
- `TAURI_SIGNING_PRIVATE_KEY`: Optional Minisign private key string for signing updater artifacts.

---

## Key Files

| Path | Purpose |
|---|---|
| `src-tauri/src/main.rs` | Rust backend: directory browsing, quick access, safe ShellExecute, protected paths, undo |
| `src-tauri/tauri.conf.json` | Tauri v2 window, strict CSP security, and updater configuration |
| `src/App.tsx` | Main application controller, parallelized startup, navigation, and state orchestration |
| `src/components/TutorialModal.tsx` | Interactive 6-step walkthrough guide, keyboard shortcuts matrix, and safety overview |
| `src/components/Sidebar.tsx` | Drives, Quick Access shortcuts, pinned folders, real-time APFS/NTFS storage usage |
| `src/components/NavigationBar.tsx` | Foldy header brand, tabs, breadcrumbs, search button, view mode switchers |
| `src/components/SettingsModal.tsx` | Preferences modal for theme selection, user profile, and update management |

---

## Undo Log Location

- **Windows**: `%APPDATA%\com.foldy.desktop\undo_log.json`
- **macOS**: `~/Library/Application Support/com.foldy.desktop/undo_log.json`
- **Linux**: `~/.local/share/com.foldy.desktop/undo_log.json`
