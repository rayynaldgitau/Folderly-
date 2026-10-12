// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{DateTime, Local};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::SystemTime,
};
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;

// ─────────────────────────────────────────────────────────────────────────────
// Shared data types
// ─────────────────────────────────────────────────────────────────────────────

/// Metadata for a single file returned to the frontend.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub created_at: String,
    pub modified_at: String,
}

/// Metadata for a folder entry when navigating in File Explorer mode.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FolderEntry {
    pub path: String,
    pub name: String,
    pub modified_at: String,
}

/// Complete contents of a folder (folders + files) for interactive navigation.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DirContents {
    pub current_path: String,
    pub parent_path: Option<String>,
    pub folders: Vec<FolderEntry>,
    pub files: Vec<FileEntry>,
}

/// Quick access item representing drives or standard user locations.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuickAccessItem {
    pub name: String,
    pub path: String,
    pub icon: String,
    pub is_drive: bool,
}

/// A single rename/move operation preview.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RenamePreview {
    pub original_path: String,
    pub new_path: String,
    /// `true` when the rename would overwrite an existing, unrelated file.
    pub conflict: bool,
}

/// Transformation rules sent from the frontend.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RenameRules {
    pub replace_spaces_with: Option<String>,
    pub add_date_prefix: bool,
    pub find_pattern: Option<String>,
    pub replace_pattern: Option<String>,
    pub to_lowercase: bool,
    pub to_uppercase: bool,
    pub trim_whitespace: bool,
    pub strip_prefix: Option<String>,
    pub strip_suffix: Option<String>,
    pub append_text: Option<String>,
    pub prepend_text: Option<String>,
}

/// One entry in the undo log.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UndoEntry {
    pub original_path: String,
    pub new_path: String,
}

/// A complete undo batch (one "Commit Changes" action).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UndoBatch {
    pub timestamp: String,
    pub operations: Vec<UndoEntry>,
}

/// Metadata for the signed-in system user.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemUserInfo {
    pub username: String,
    pub display_name: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Formats a `SystemTime` as an ISO-8601 local-time string.
///
/// * `t`: Optional system timestamp from filesystem metadata.
/// * Returns: Formatted ISO-8601 timestamp or "unknown".
fn format_time(t: Option<SystemTime>) -> String {
    match t {
        Some(st) => {
            let dt: DateTime<Local> = st.into();
            dt.format("%Y-%m-%dT%H:%M:%S").to_string()
        }
        None => "unknown".to_string(),
    }
}

/// Returns the path to the undo-log JSON file inside the app data directory.
///
/// * `app`: Tauri application handle for path resolution.
/// * Returns: Resolved PathBuf to undo_log.json or an error message.
fn undo_log_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {e}"))?;
    fs::create_dir_all(&base).map_err(|e| format!("Cannot create app data dir: {e}"))?;
    Ok(base.join("undo_log.json"))
}

/// Applies all active rules to a file stem and returns the transformed stem.
///
/// * `stem`: File stem name without extension.
/// * `rules`: Configuration containing regex, prefix, suffix, and casing rules.
/// * Returns: Transformed stem string or error for malformed regex.
fn apply_rules_to_stem(stem: &str, rules: &RenameRules) -> Result<String, String> {
    let mut s = stem.to_string();

    if rules.trim_whitespace {
        s = s.trim().to_string();
    }
    if rules.to_lowercase {
        s = s.to_lowercase();
    } else if rules.to_uppercase {
        s = s.to_uppercase();
    }
    if let Some(pfx) = &rules.strip_prefix {
        if !pfx.is_empty() && s.starts_with(pfx.as_str()) {
            s = s[pfx.len()..].to_string();
        }
    }
    if let Some(sfx) = &rules.strip_suffix {
        if !sfx.is_empty() && s.ends_with(sfx.as_str()) {
            s = s[..s.len() - sfx.len()].to_string();
        }
    }
    if let Some(repl) = &rules.replace_spaces_with {
        s = s.replace(' ', repl);
    }
    if let Some(pattern) = &rules.find_pattern {
        if !pattern.is_empty() {
            let re = Regex::new(pattern)
                .map_err(|e| format!("Invalid regex '{pattern}': {e}"))?;
            let replacement = rules.replace_pattern.as_deref().unwrap_or("");
            s = re.replace_all(&s, replacement).to_string();
        }
    }
    if let Some(pre) = &rules.prepend_text {
        if !pre.is_empty() {
            s = format!("{pre}{s}");
        }
    }
    if let Some(app_text) = &rules.append_text {
        if !app_text.is_empty() {
            s = format!("{s}{app_text}");
        }
    }
    if rules.add_date_prefix {
        let today = Local::now().format("%Y-%m-%d").to_string();
        s = format!("{today}_{s}");
    }

    Ok(s)
}

/// Computes the new `PathBuf` for a file given the active rules.
///
/// * `original`: Current filesystem path of the file.
/// * `rules`: Rename rules to apply.
/// * Returns: PathBuf representing the proposed new file path.
fn compute_new_path(original: &Path, rules: &RenameRules) -> Result<PathBuf, String> {
    let parent = original
        .parent()
        .ok_or_else(|| format!("'{}' has no parent directory", original.display()))?;
    let stem = original.file_stem().and_then(|s| s.to_str()).unwrap_or("");
    let ext  = original.extension().and_then(|e| e.to_str()).unwrap_or("");
    let new_stem = apply_rules_to_stem(stem, rules)?;
    let new_name = if ext.is_empty() { new_stem } else { format!("{new_stem}.{ext}") };
    Ok(parent.join(new_name))
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — isolated in their own module to avoid macro collisions
// ─────────────────────────────────────────────────────────────────────────────

mod commands {
    use super::*;

    /// Reads immediate contents of a directory (folders and files) without recursing.
    ///
    /// * `dir_path`: Absolute path of the folder to inspect.
    /// * Returns: `DirContents` containing current path, parent path, folders, and files.
    #[tauri::command]
    pub fn read_folder_contents(dir_path: String) -> Result<DirContents, String> {
        let path = PathBuf::from(&dir_path);
        if !path.exists() {
            return Err(format!("Path does not exist: {dir_path}"));
        }
        if !path.is_dir() {
            return Err(format!("Not a directory: {dir_path}"));
        }

        let parent_path = path.parent().map(|p| p.to_string_lossy().to_string());
        let mut folders: Vec<FolderEntry> = Vec::new();
        let mut files: Vec<FileEntry> = Vec::new();

        let entries = fs::read_dir(&path)
            .map_err(|e| format!("Cannot read directory '{dir_path}': {e}"))?;

        for entry_res in entries {
            let entry = match entry_res {
                Ok(e) => e,
                Err(_) => continue, // Skip inaccessible file system entries
            };

            let entry_path = entry.path();
            let meta = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };

            let name = entry.file_name().to_string_lossy().to_string();

            if meta.is_dir() {
                folders.push(FolderEntry {
                    path: entry_path.to_string_lossy().to_string(),
                    name,
                    modified_at: format_time(meta.modified().ok()),
                });
            } else if meta.is_file() {
                let extension = entry_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();

                files.push(FileEntry {
                    path: entry_path.to_string_lossy().to_string(),
                    name,
                    extension,
                    size: meta.len(),
                    created_at: format_time(meta.created().ok()),
                    modified_at: format_time(meta.modified().ok()),
                });
            }
        }

        // Sort items case-insensitively for a polished Explorer feel
        folders.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(DirContents {
            current_path: path.to_string_lossy().to_string(),
            parent_path,
            folders,
            files,
        })
    }

    /// Discovers system drives and standard Windows user folders.
    ///
    /// * Returns: List of QuickAccessItem entries for the sidebar.
    #[tauri::command]
    pub fn get_quick_access() -> Result<Vec<QuickAccessItem>, String> {
        let mut items: Vec<QuickAccessItem> = Vec::new();

        // 1. Enumerate Windows drive letters (C:\ to Z:\)
        #[cfg(target_os = "windows")]
        {
            for letter in b'C'..=b'Z' {
                let drive_str = format!("{}:\\", letter as char);
                let p = Path::new(&drive_str);
                if p.is_dir() {
                    items.push(QuickAccessItem {
                        name: format!("Local Disk ({}:)", letter as char),
                        path: drive_str,
                        icon: "💾".to_string(),
                        is_drive: true,
                    });
                }
            }
        }

        // 2. Discover standard user folders via USERPROFILE
        if let Ok(profile) = std::env::var("USERPROFILE") {
            let user_dir = PathBuf::from(profile);
            let shortcuts = [
                ("Desktop", "Desktop", "🖥️"),
                ("Downloads", "Downloads", "📥"),
                ("Documents", "Documents", "📁"),
                ("Pictures", "Pictures", "🖼️"),
                ("Music", "Music", "🎵"),
                ("Videos", "Videos", "🎬"),
            ];

            for (label, sub, icon) in shortcuts {
                let full = user_dir.join(sub);
                if full.is_dir() {
                    items.push(QuickAccessItem {
                        name: label.to_string(),
                        path: full.to_string_lossy().to_string(),
                        icon: icon.to_string(),
                        is_drive: false,
                    });
                }
            }

            // User Home folder
            items.push(QuickAccessItem {
                name: "Home".to_string(),
                path: user_dir.to_string_lossy().to_string(),
                icon: "🏠".to_string(),
                is_drive: false,
            });
        }

        Ok(items)
    }

    /// Launches a file or directory using the OS default application.
    ///
    /// * `path`: Full path to open.
    /// * Returns: Ok(()) on successful spawn or an error message.
    #[tauri::command]
    pub fn open_in_os(path: String) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            // Use explorer / shell execute to open files with their registered associations
            Command::new("cmd")
                .args(["/c", "start", "", &path])
                .spawn()
                .map_err(|e| format!("Failed to open '{path}': {e}"))?;
        }

        #[cfg(target_os = "macos")]
        {
            Command::new("open")
                .arg(&path)
                .spawn()
                .map_err(|e| format!("Failed to open '{path}': {e}"))?;
        }

        #[cfg(target_os = "linux")]
        {
            Command::new("xdg-open")
                .arg(&path)
                .spawn()
                .map_err(|e| format!("Failed to open '{path}': {e}"))?;
        }

        Ok(())
    }

    /// Opens the native Windows File Explorer and selects/highlights the item.
    ///
    /// * `path`: Target file or directory to reveal.
    /// * Returns: Ok(()) or error message.
    #[tauri::command]
    pub fn show_in_file_manager(path: String) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            Command::new("explorer")
                .arg(format!("/select,{}", path))
                .spawn()
                .map_err(|e| format!("Failed to reveal '{path}': {e}"))?;
        }

        #[cfg(not(target_os = "windows"))]
        {
            let p = Path::new(&path);
            let dir = if p.is_dir() { p } else { p.parent().unwrap_or(p) };
            Self::open_in_os(dir.to_string_lossy().to_string())?;
        }

        Ok(())
    }

    /// Deletes a file or directory permanently.
    ///
    /// * `path`: Path to delete.
    /// * Returns: Ok(()) or detailed error message.
    #[tauri::command]
    pub fn delete_item(path: String) -> Result<(), String> {
        let p = Path::new(&path);
        if !p.exists() {
            return Err(format!("Item not found: {path}"));
        }

        if p.is_dir() {
            fs::remove_dir_all(p)
                .map_err(|e| format!("Cannot delete directory '{path}': {e}"))?;
        } else {
            fs::remove_file(p)
                .map_err(|e| format!("Cannot delete file '{path}': {e}"))?;
        }

        Ok(())
    }

    /// Recursively reads all files under `dir_path` for recursive bulk operations.
    ///
    /// * `dir_path`: Root folder path.
    /// * Returns: Flat list of FileEntry items.
    #[tauri::command]
    pub fn scan_directory(dir_path: String) -> Result<Vec<FileEntry>, String> {
        let root = PathBuf::from(&dir_path);
        if !root.exists() {
            return Err(format!("Path does not exist: {dir_path}"));
        }
        if !root.is_dir() {
            return Err(format!("Not a directory: {dir_path}"));
        }

        let mut entries: Vec<FileEntry> = Vec::new();

        for entry_result in WalkDir::new(&root)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry_result.path().to_path_buf();
            if !path.is_file() {
                continue;
            }
            let meta = match fs::metadata(&path) {
                Ok(m) => m,
                Err(_) => continue,
            };
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();
            let extension = path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            entries.push(FileEntry {
                path: path.to_string_lossy().to_string(),
                name,
                extension,
                size: meta.len(),
                created_at: format_time(meta.created().ok()),
                modified_at: format_time(meta.modified().ok()),
            });
        }

        Ok(entries)
    }

    /// Previews rename operations without touching the filesystem.
    ///
    /// * `file_paths`: List of files to transform.
    /// * `rules`: Configuration of rename rules.
    /// * Returns: List of RenamePreview elements showing original and new paths.
    #[tauri::command]
    pub fn preview_renames(
        file_paths: Vec<String>,
        rules: RenameRules,
    ) -> Result<Vec<RenamePreview>, String> {
        if let Some(pattern) = &rules.find_pattern {
            if !pattern.is_empty() {
                Regex::new(pattern)
                    .map_err(|e| format!("Invalid regex '{pattern}': {e}"))?;
            }
        }

        let mut previews: Vec<RenamePreview> = Vec::new();

        for raw_path in &file_paths {
            let original = PathBuf::from(raw_path);
            let new_path = match compute_new_path(&original, &rules) {
                Ok(p) => p,
                Err(e) => {
                    previews.push(RenamePreview {
                        original_path: raw_path.clone(),
                        new_path: format!("ERROR: {e}"),
                        conflict: true,
                    });
                    continue;
                }
            };

            let conflict = new_path.exists() && new_path != original;
            previews.push(RenamePreview {
                original_path: raw_path.clone(),
                new_path: new_path.to_string_lossy().to_string(),
                conflict,
            });
        }

        Ok(previews)
    }

    /// Executes rename/move operations after recording the undo log.
    ///
    /// * `app`: Tauri application handle.
    /// * `previews`: List of previewed operations to commit.
    /// * Returns: Summary message of successes and individual errors.
    #[tauri::command]
    pub fn commit_renames(
        app: AppHandle,
        previews: Vec<RenamePreview>,
    ) -> Result<String, String> {
        let ops: Vec<&RenamePreview> = previews
            .iter()
            .filter(|p| {
                p.original_path != p.new_path
                    && !p.new_path.starts_with("ERROR:")
                    && !p.conflict
            })
            .collect();

        if ops.is_empty() {
            return Err("No valid operations to execute.".to_string());
        }

        let log_path = undo_log_path(&app)?;
        let mut all_batches: Vec<UndoBatch> = if log_path.exists() {
            let raw = fs::read_to_string(&log_path)
                .map_err(|e| format!("Cannot read undo log: {e}"))?;
            serde_json::from_str(&raw).unwrap_or_default()
        } else {
            Vec::new()
        };

        let batch = UndoBatch {
            timestamp: Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
            operations: ops
                .iter()
                .map(|p| UndoEntry {
                    original_path: p.original_path.clone(),
                    new_path: p.new_path.clone(),
                })
                .collect(),
        };
        all_batches.push(batch);

        let log_json = serde_json::to_string_pretty(&all_batches)
            .map_err(|e| format!("Cannot serialize undo log: {e}"))?;
        fs::write(&log_path, &log_json)
            .map_err(|e| format!("Cannot write undo log: {e}"))?;

        let mut success = 0usize;
        let mut errors: Vec<String> = Vec::new();

        for op in &ops {
            let src = Path::new(&op.original_path);
            let dst = Path::new(&op.new_path);

            if let Some(parent) = dst.parent() {
                if let Err(e) = fs::create_dir_all(parent) {
                    errors.push(format!("Cannot create '{}': {e}", parent.display()));
                    continue;
                }
            }

            match fs::rename(src, dst) {
                Ok(_) => success += 1,
                Err(e) => match fs::copy(src, dst) {
                    Ok(_) => {
                        if let Err(del) = fs::remove_file(src) {
                            errors.push(format!(
                                "Copied '{}' but couldn't delete source: {del}",
                                src.display()
                            ));
                        } else {
                            success += 1;
                        }
                    }
                    Err(ce) => errors.push(format!(
                        "Cannot move '{}': rename={e}, copy={ce}",
                        src.display()
                    )),
                },
            }
        }

        let mut summary = format!("{success} file(s) renamed.");
        if !errors.is_empty() {
            summary.push_str(&format!(" {} error(s): {}", errors.len(), errors.join("; ")));
        }
        Ok(summary)
    }

    /// Reverses the most recent batch of renames from the undo log.
    ///
    /// * `app`: Tauri application handle.
    /// * Returns: Summary message of restored files and individual errors.
    #[tauri::command]
    pub fn undo_last_batch(app: AppHandle) -> Result<String, String> {
        let log_path = undo_log_path(&app)?;
        if !log_path.exists() {
            return Err("No undo log found – nothing to undo.".to_string());
        }

        let raw = fs::read_to_string(&log_path)
            .map_err(|e| format!("Cannot read undo log: {e}"))?;
        let mut all_batches: Vec<UndoBatch> = serde_json::from_str(&raw)
            .map_err(|e| format!("Undo log is corrupt: {e}"))?;

        let batch = all_batches
            .pop()
            .ok_or_else(|| "Undo log is empty – nothing to undo.".to_string())?;

        let mut success = 0usize;
        let mut errors: Vec<String> = Vec::new();

        for op in batch.operations.iter().rev() {
            let src = Path::new(&op.new_path);
            let dst = Path::new(&op.original_path);

            if !src.exists() {
                errors.push(format!("Cannot undo: '{}' no longer exists", src.display()));
                continue;
            }
            if let Some(parent) = dst.parent() {
                if let Err(e) = fs::create_dir_all(parent) {
                    errors.push(format!("Cannot recreate '{}': {e}", parent.display()));
                    continue;
                }
            }
            match fs::rename(src, dst) {
                Ok(_) => success += 1,
                Err(e) => match fs::copy(src, dst) {
                    Ok(_) => {
                        if let Err(del) = fs::remove_file(src) {
                            errors.push(format!(
                                "Restored '{}' but couldn't delete '{}': {del}",
                                dst.display(),
                                src.display()
                            ));
                        } else {
                            success += 1;
                        }
                    }
                    Err(ce) => errors.push(format!(
                        "Cannot undo '{}': rename={e}, copy={ce}",
                        src.display()
                    )),
                },
            }
        }

        let updated = serde_json::to_string_pretty(&all_batches)
            .map_err(|e| format!("Cannot serialize updated log: {e}"))?;
        fs::write(&log_path, updated)
            .map_err(|e| format!("Cannot write updated undo log: {e}"))?;

        let mut summary = format!("{success} file(s) restored.");
        if !errors.is_empty() {
            summary.push_str(&format!(" {} error(s): {}", errors.len(), errors.join("; ")));
        }
        Ok(summary)
    }

    /// Performs a high-performance universal search across common personal folders
    /// and laptop drives for files or directories matching the query string.
    ///
    /// * `query`: Search term to match case-insensitively against file/folder names.
    /// * `max_results`: Maximum number of search results to return to avoid UI lag.
    /// * Returns: Matching FileEntry list.
    #[tauri::command]
    pub fn universal_search(query: String, max_results: usize) -> Result<Vec<FileEntry>, String> {
        let q = query.trim().to_lowercase();
        if q.is_empty() {
            return Ok(Vec::new());
        }

        let mut results: Vec<FileEntry> = Vec::new();
        let limit = if max_results == 0 { 150 } else { max_results };

        // Collect search root locations (common user directories and drives)
        let mut search_roots: Vec<PathBuf> = Vec::new();

        if let Ok(profile) = std::env::var("USERPROFILE") {
            let user_dir = PathBuf::from(profile);
            let subdirs = ["Desktop", "Downloads", "Documents", "Pictures", "Music", "Videos"];
            for sub in subdirs {
                let p = user_dir.join(sub);
                if p.is_dir() {
                    search_roots.push(p);
                }
            }
            search_roots.push(user_dir);
        }

        #[cfg(target_os = "windows")]
        {
            for letter in b'C'..=b'Z' {
                let drive_str = format!("{}:\\", letter as char);
                let p = PathBuf::from(&drive_str);
                if p.is_dir() && !search_roots.contains(&p) {
                    search_roots.push(p);
                }
            }
        }

        for root in search_roots {
            if results.len() >= limit {
                break;
            }

            // Set max_depth to keep searches snappy while filtering out bloat
            let walker = WalkDir::new(&root)
                .max_depth(5)
                .follow_links(false)
                .into_iter()
                .filter_entry(|e| {
                    let name = e.file_name().to_string_lossy();
                    !name.starts_with('.')
                        && !name.eq_ignore_ascii_case("AppData")
                        && !name.eq_ignore_ascii_case("node_modules")
                        && !name.eq_ignore_ascii_case("$Recycle.Bin")
                        && !name.eq_ignore_ascii_case("System Volume Information")
                        && !name.eq_ignore_ascii_case("Windows")
                });

            for entry_res in walker.filter_map(|e| e.ok()) {
                let name = entry_res.file_name().to_string_lossy();
                if name.to_lowercase().contains(&q) {
                    let path = entry_res.path();
                    let meta = match entry_res.metadata() {
                        Ok(m) => m,
                        Err(_) => continue,
                    };

                    let extension = path
                        .extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or(if meta.is_dir() { "folder" } else { "" })
                        .to_lowercase();

                    results.push(FileEntry {
                        path: path.to_string_lossy().to_string(),
                        name: name.to_string(),
                        extension,
                        size: meta.len(),
                        created_at: format_time(meta.created().ok()),
                        modified_at: format_time(meta.modified().ok()),
                    });

                    if results.len() >= limit {
                        break;
                    }
                }
            }
        }

        Ok(results)
    }

    /// Creates a new directory at the specified path.
    ///
    /// * `dir_path`: Absolute path of the folder to create.
    /// * Returns: Ok(()) or error message.
    #[tauri::command]
    pub fn create_directory(dir_path: String) -> Result<(), String> {
        let p = Path::new(&dir_path);
        fs::create_dir_all(p).map_err(|e| format!("Cannot create folder '{dir_path}': {e}"))?;
        Ok(())
    }

    /// Returns the number of available undo batches for UI button enablement.
    ///
    /// * `app`: Tauri application handle.
    /// * Returns: Total count of undo batches.
    #[tauri::command]
    pub fn undo_batch_count(app: AppHandle) -> Result<usize, String> {
        let log_path = undo_log_path(&app)?;
        if !log_path.exists() {
            return Ok(0);
        }
        let raw = fs::read_to_string(&log_path)
            .map_err(|e| format!("Cannot read undo log: {e}"))?;
        let batches: Vec<UndoBatch> = serde_json::from_str(&raw).unwrap_or_default();
        Ok(batches.len())
    }

    /// Returns the signed-in Windows user account username and Microsoft/Local display name.
    ///
    /// * Returns: `SystemUserInfo` with username and display_name.
    #[tauri::command]
    pub fn get_system_user() -> Result<SystemUserInfo, String> {
        let username = std::env::var("USERNAME").unwrap_or_else(|_| "User".to_string());
        let mut display_name = username.clone();

        #[cfg(target_os = "windows")]
        {
            // Query local user full name / Microsoft account display name via PowerShell
            let output = Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-Command",
                    &format!(
                        "(Get-LocalUser -Name '{}' -ErrorAction SilentlyContinue).FullName",
                        username
                    ),
                ])
                .output();

            if let Ok(out) = output {
                let full = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !full.is_empty() {
                    display_name = full;
                }
            }
        }

        Ok(SystemUserInfo {
            username,
            display_name,
        })
    }

    /// Opens a new Folderly application window.
    ///
    /// * `app`: The Tauri application handle.
    /// * Returns: `Ok(())` if the window is successfully spawned, or `Err(String)` on failure.
    #[tauri::command]
    pub fn open_new_window(app: AppHandle) -> Result<(), String> {
        let ts = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_millis();
        let label = format!("window-{}", ts);
        tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::App("index.html".into()))
            .title("Folderly")
            .inner_size(1280.0, 800.0)
            .min_inner_size(420.0, 360.0)
            .build()
            .map_err(|e| format!("Failed to create window: {}", e))?;
        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::read_folder_contents,
            commands::get_quick_access,
            commands::get_system_user,
            commands::open_new_window,
            commands::open_in_os,
            commands::show_in_file_manager,
            commands::delete_item,
            commands::create_directory,
            commands::scan_directory,
            commands::preview_renames,
            commands::commit_renames,
            commands::undo_last_batch,
            commands::undo_batch_count,
            commands::universal_search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
