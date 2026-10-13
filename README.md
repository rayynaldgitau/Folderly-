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

## Key Features

- **Tabbed Browsing**: Modern browser-style tab strip (`Ctrl+T`, `Ctrl+W`) with drag & drop support.
- **Cute Mascot & Polish**: Adorable Foldy mascot logo, custom themes (OLED Pink, Light Pink, Material, Apple, Dark).
- **Universal Laptop Search**: Spotlight-style command palette (`Ctrl+K`) searching across your entire PC.
- **Fast Navigation & Recents**: OneDrive redirection support, Quick Access drives, Recents history view.
- **View Modes & Sorting**: Kanban grouped cards, details table, grid tiles; sort by type, name, date, size.
- **Safe Bulk Renamer**: Rule builder (date prefix, regex, casing), side-by-side diff preview, and one-click batch undo.

---

## How to Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (hot-reloads React + native window)
npm run tauri dev

# 3. Build standalone executable & installers
npm run tauri build
```

### Outputs
- **Windows**: `src-tauri/target/release/foldy.exe` & `bundle/nsis/Foldy_0.1.0_x64-setup.exe`
- **macOS**: `src-tauri/target/release/bundle/dmg/Foldy_0.1.0_x64.dmg` & `Foldy.app`

---

## Key Files

| Path | Purpose |
|---|---|
| `src-tauri/src/main.rs` | Rust backend: directory browsing, quick access drives, OS launch, dry-run, undo |
| `src-tauri/Cargo.toml` | Rust dependencies (`walkdir`, `regex`, `chrono`, `serde`) |
| `src-tauri/tauri.conf.json` | Tauri window, app bundle, and identifier configuration (`com.foldy.desktop`) |
| `src/App.tsx` | Main application controller wiring explorer navigation and bulk renamer |
| `src/components/FoldyLogo.tsx` | Vector SVG cute Foldy mascot logo |
| `src/components/NavigationBar.tsx` | Foldy header brand, tabs, breadcrumbs, search button, view mode switchers |
| `src/components/Sidebar.tsx` | Drives, Quick Access shortcuts, pinned folders, storage usage |
| `src/components/FileTableView.tsx` | Classic details table with sortable columns |
| `src/components/FileGrid.tsx` | Grouped cards and grid tile views |
| `src/components/SettingsModal.tsx` | Preferences modal for theme selection & Microsoft user profile |

---

## Undo Log Location

- **Windows**: `%APPDATA%\com.foldy.desktop\undo_log.json`
- **macOS**: `~/Library/Application Support/com.foldy.desktop/undo_log.json`
- **Linux**: `~/.local/share/com.foldy.desktop/undo_log.json`
