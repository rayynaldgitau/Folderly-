# Folderly

> A visual File Explorer and bulk-renamer desktop app built with Tauri 2, Rust, React, TypeScript, and Tailwind CSS.

---

## Key Features

| Category | Features |
|---|---|
| **Tabbed Browsing** | Modern tab strip supporting multiple tabs (`Ctrl+T` or `+` button), tab switching, and closing (`Ctrl+W` or `✕` button) |
| **OneDrive Redirection Support** | Automatic resolution for Windows OneDrive folder redirection (`Desktop`, `Documents`, `Pictures`) preventing missing path errors |
| **Recents Page** | Dedicated Quick Access `🕒 Recents` page listing recent downloads and recently opened files with automatic history tracking |
| **Sort by File Type** | Interactive sort dropdown supporting `🏷️ File Type` (grouping extensions alphabetically), `🔤 Name`, `📅 Date Modified`, and `⚖️ File Size` |
| **macOS Vector Icons** | Authentic macOS-inspired vector SVG icons: signature sky-blue rounded folder with tab bevel and document cards with dog-eared folds and extension badges |
| **Settings & Theme Modal** | Dedicated Settings panel (`⚙️`) with full theme selector (OLED Pink, Light Pink, Material, Apple, Dark), keyboard shortcuts guide, and user management |
| **Microsoft Account & Custom User** | Automatically detects signed-in Windows / Microsoft account display name with full user override and workspace customization |
| **Universal Laptop Search** | Spotlight-style command palette (`Ctrl+K` or "Search Laptop" button) searching files and folders across your entire computer with instant open, locate, and reveal actions |
| **Clean Window Layout** | Streamlined top bar with no duplicate window buttons; native OS minimize, maximize, and close controls |
| **Side-by-Side Responsive Layout** | Window snaps easily side-by-side with other apps (min width 420px); responsive off-canvas sidebar and flexible drawer prevent layout crowding |
| **File Explorer Navigation** | Interactive breadcrumbs path bar, manual path entry, Back/Forward/Up/Refresh history, Quick Access sidebar (Recents, Drives `C:\`, Desktop, Downloads, Documents, etc.), subdirectories tree |
| **Interactive File Actions** | Double-click to open folders or launch files in OS default apps; right-click context menu ("Show in File Manager", "Copy Path", "Delete"); "+ New folder" creation button |
| **View Modes & Sorting** | Switch between **Kanban Cards**, **Classic Details Table**, and **Grid Tiles**; sort by Type, Name, Date, or Size with Folders-First toggle |
| **Live Filtering** | Real-time search box filtering files and folders as you type; optional recursive subfolder scan toggle |
| **Rule Builder Engine** | Add date prefixes (`YYYY-MM-DD`), space-to-dash replacements, regex find/replace, case transformations, strip prefixes/suffixes, prepend/append text |
| **Dry-Run & Safe Commit** | Side-by-side visual diff preview before touching disk; writes a JSON undo log before executing; cross-drive move fallback |
| **One-Click Undo** | Safely reverses the entire last batch of operations |

---

## Installation & Running

```bash
# 1. Install frontend dependencies
npm install

# 2. Run in development mode (hot-reloads React + native window)
npm run tauri dev

# 3. Build standalone native executable (.exe & .msi)
npm run tauri build
```

Binary outputs land in:
- Executable: `src-tauri/target/release/folderly.exe`
- Setup installer: `src-tauri/target/release/bundle/nsis/Folderly_0.1.0_x64-setup.exe`
- MSI package: `src-tauri/target/release/bundle/msi/Folderly_0.1.0_x64_en-US.msi`

---

## Key Files

| Path | Purpose |
|---|---|
| `src-tauri/src/main.rs` | Rust backend: directory browsing, quick access drives, OS launch, dry-run, undo |
| `src-tauri/Cargo.toml` | Rust dependencies (`walkdir`, `regex`, `chrono`, `serde`) |
| `src-tauri/tauri.conf.json` | Window, bundle, and devUrl configuration |
| `src/App.tsx` | Main application controller wiring explorer navigation and renamer |
| `src/types.ts` | TypeScript interfaces mirroring backend structs |
| `src/components/NavigationBar.tsx` | Breadcrumbs, history buttons, search bar, view mode switcher |
| `src/components/Sidebar.tsx` | Drives, Quick Access shortcuts, subfolders list |
| `src/components/FileTableView.tsx` | Classic details table with sortable columns |
| `src/components/FileGrid.tsx` | Kanban cards and uniform grid tile views |
| `src/components/MacIcons.tsx` | High-fidelity macOS SVG folder and file icons |
| `src/components/SettingsModal.tsx` | Preferences modal for theme selection & Microsoft user profile |
| `src/components/FileContextMenu.tsx` | Floating right-click action menu |
| `src/components/RuleBuilder.tsx` | Pattern builder for bulk renaming |
| `src/components/PreviewPanel.tsx` | Side-by-side visual diff panel |
| `src/components/StatusBar.tsx` | Status message footer |

---

## Undo Log Location

The undo log (`undo_log.json`) is stored in the system application data directory:
- **Windows**: `%APPDATA%\com.folderly.app\undo_log.json`
- **macOS**: `~/Library/Application Support/com.folderly.app/undo_log.json`
- **Linux**: `~/.local/share/com.folderly.app/undo_log.json`
