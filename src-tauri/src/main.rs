// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{DateTime, Local};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::{Mutex, OnceLock},
    time::{Instant, SystemTime},
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

/// Storage metadata for a drive or filesystem volume.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiskUsage {
    pub drive_name: String,
    pub mount_path: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub used_bytes: u64,
    pub used_percentage: f64,
    pub total_formatted: String,
    pub free_formatted: String,
    pub used_formatted: String,
}

/// Global thread-safe in-memory cache for folder contents to eliminate navigation latency.
static DIR_CACHE: OnceLock<Mutex<HashMap<String, (Instant, DirContents)>>> = OnceLock::new();

/// Returns reference to the directory cache singleton.
fn get_dir_cache() -> &'static Mutex<HashMap<String, (Instant, DirContents)>> {
    DIR_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Invalidates a specific folder from the cache, or the entire cache if None.
fn invalidate_dir_cache(path: Option<&str>) {
    if let Ok(mut cache) = get_dir_cache().lock() {
        if let Some(p) = path {
            let key = p.to_lowercase().replace('/', "\\");
            cache.retain(|k, _| !k.starts_with(&key));
        } else {
            cache.clear();
        }
    }
}

/// Formats byte counts into human-readable strings (e.g. "128 GB").
fn format_bytes(bytes: u64) -> String {
    const KB: f64 = 1024.0;
    const MB: f64 = KB * 1024.0;
    const GB: f64 = MB * 1024.0;
    const TB: f64 = GB * 1024.0;

    let b = bytes as f64;
    if b >= TB {
        format!("{:.1} TB", b / TB)
    } else if b >= GB {
        format!("{:.0} GB", (b / GB).round())
    } else if b >= MB {
        format!("{:.0} MB", (b / MB).round())
    } else {
        format!("{:.0} KB", (b / KB).round())
    }
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

/// Resolves a directory path, handling Windows OneDrive folder redirection
/// and cross-platform path recovery (e.g. running with Windows paths on macOS or vice-versa).
///
/// * `raw_path`: Raw directory path requested by client or UI.
/// * Returns: The resolved existing `PathBuf` or a safe existing fallback `PathBuf`.
fn resolve_system_path(raw_path: &str) -> PathBuf {
    let trimmed = raw_path.trim();
    if trimmed.is_empty() {
        return PathBuf::from(raw_path);
    }

    let path = PathBuf::from(trimmed);
    if path.exists() {
        return path;
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(profile) = std::env::var("USERPROFILE") {
            let user_dir = Path::new(&profile);

            // Handle bare names and aliases like "desktop", "photos", "photos & pictures", "home", etc.
            let lower = trimmed.to_lowercase();
            let subfolder_name: Option<&str> = if lower == "desktop" || lower.contains("desktop") {
                Some("Desktop")
            } else if lower == "pictures" || lower == "photos" || lower.contains("picture") || lower.contains("photo") {
                Some("Pictures")
            } else if lower == "downloads" || lower.contains("download") {
                Some("Downloads")
            } else if lower == "documents" || lower.contains("document") {
                Some("Documents")
            } else if lower == "music" || lower.contains("music") {
                Some("Music")
            } else if lower == "videos" || lower == "movies" || lower.contains("video") || lower.contains("movie") {
                Some("Videos")
            } else if lower == "home" || lower == "~" {
                Some("")
            } else {
                None
            };

            if let Some(sub) = subfolder_name {
                if sub.is_empty() {
                    return user_dir.to_path_buf();
                }
                let od_cand = user_dir.join("OneDrive").join(sub);
                if od_cand.exists() {
                    return od_cand;
                }
                if let Ok(od_env) = std::env::var("OneDrive").or_else(|_| std::env::var("OneDriveConsumer")) {
                    let od_env_cand = Path::new(&od_env).join(sub);
                    if od_env_cand.exists() {
                        return od_env_cand;
                    }
                }
                let local_cand = user_dir.join(sub);
                if local_cand.exists() {
                    return local_cand;
                }
            }

            // Case 1: Client asked for C:\Users\<user>\<subfolder>, but it's redirected to OneDrive
            if let Ok(rel) = path.strip_prefix(user_dir) {
                let rel_str = rel.to_string_lossy();
                let effective_rel = if rel_str.eq_ignore_ascii_case("Photos") {
                    Path::new("Pictures")
                } else {
                    rel
                };

                let od_cand = user_dir.join("OneDrive").join(effective_rel);
                if od_cand.exists() {
                    return od_cand;
                }
                if let Ok(od_env) = std::env::var("OneDrive").or_else(|_| std::env::var("OneDriveConsumer")) {
                    let od_env_cand = Path::new(&od_env).join(effective_rel);
                    if od_env_cand.exists() {
                        return od_env_cand;
                    }
                }
                let local_cand = user_dir.join(effective_rel);
                if local_cand.exists() {
                    return local_cand;
                }
            }

            // Case 2: Client asked for OneDrive\<subfolder>, but it's located locally
            if let Ok(od_env) = std::env::var("OneDrive").or_else(|_| std::env::var("OneDriveConsumer")) {
                if let Ok(rel) = path.strip_prefix(Path::new(&od_env)) {
                    let local_cand = user_dir.join(rel);
                    if local_cand.exists() {
                        return local_cand;
                    }
                }
            }

            // Case 3: Path contained a hardcoded user path or mismatched username (e.g. C:\Users\other\Pictures)
            let normalized = trimmed.replace('/', "\\");
            for part in normalized.split('\\').filter(|p| !p.is_empty()) {
                let p_lower = part.to_lowercase();
                let sub_match = if p_lower == "desktop" || p_lower.contains("desktop") {
                    Some("Desktop")
                } else if p_lower == "pictures" || p_lower == "photos" || p_lower.contains("picture") || p_lower.contains("photo") {
                    Some("Pictures")
                } else if p_lower == "downloads" || p_lower.contains("download") {
                    Some("Downloads")
                } else if p_lower == "documents" || p_lower.contains("document") {
                    Some("Documents")
                } else if p_lower == "music" || p_lower.contains("music") {
                    Some("Music")
                } else if p_lower == "videos" || p_lower.contains("video") {
                    Some("Videos")
                } else {
                    None
                };

                if let Some(sub) = sub_match {
                    let od_cand = user_dir.join("OneDrive").join(sub);
                    if od_cand.exists() {
                        return od_cand;
                    }
                    if let Ok(od_env) = std::env::var("OneDrive").or_else(|_| std::env::var("OneDriveConsumer")) {
                        let od_env_cand = Path::new(&od_env).join(sub);
                        if od_env_cand.exists() {
                            return od_env_cand;
                        }
                    }
                    let local_cand = user_dir.join(sub);
                    if local_cand.exists() {
                        return local_cand;
                    }
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(home) = std::env::var("HOME") {
            let user_dir = Path::new(&home);
            let lower = trimmed.to_lowercase();
            let subfolder_name: Option<&str> = if lower == "desktop" || lower.contains("desktop") {
                Some("Desktop")
            } else if lower == "pictures" || lower == "photos" || lower.contains("picture") || lower.contains("photo") {
                Some("Pictures")
            } else if lower == "downloads" || lower.contains("download") {
                Some("Downloads")
            } else if lower == "documents" || lower.contains("document") {
                Some("Documents")
            } else if lower == "music" || lower.contains("music") {
                Some("Music")
            } else if lower == "videos" || lower == "movies" || lower.contains("video") || lower.contains("movie") {
                Some("Movies")
            } else if lower == "home" || lower == "~" {
                Some("")
            } else {
                None
            };

            if let Some(sub) = subfolder_name {
                if sub.is_empty() {
                    return user_dir.to_path_buf();
                }
                let cand = user_dir.join(sub);
                if cand.exists() {
                    return cand;
                }
            }

            if raw_path.starts_with("~/") || raw_path == "~" {
                let tail = if raw_path == "~" { "" } else { &raw_path[2..] };
                let cand = user_dir.join(tail);
                if cand.exists() {
                    return cand;
                }
            }

            // If raw_path has Windows-style C:\Users\... or C:/Users/... on macOS:
            let normalized = trimmed.replace('\\', "/");
            for part in normalized.split('/').filter(|p| !p.is_empty()) {
                let p_lower = part.to_lowercase();
                let sub_match = if p_lower == "desktop" || p_lower.contains("desktop") {
                    Some("Desktop")
                } else if p_lower == "pictures" || p_lower == "photos" || p_lower.contains("picture") || p_lower.contains("photo") {
                    Some("Pictures")
                } else if p_lower == "downloads" || p_lower.contains("download") {
                    Some("Downloads")
                } else if p_lower == "documents" || p_lower.contains("document") {
                    Some("Documents")
                } else if p_lower == "music" || p_lower.contains("music") {
                    Some("Music")
                } else if p_lower == "videos" || p_lower == "movies" || p_lower.contains("video") || p_lower.contains("movie") {
                    Some("Movies")
                } else {
                    None
                };

                if let Some(sub) = sub_match {
                    let cand = user_dir.join(sub);
                    if cand.exists() {
                        return cand;
                    }
                }
            }

            // Fallback for foreign Windows-style drive root on macOS
            if trimmed.contains(":\\") || trimmed.contains(":/") {
                return user_dir.to_path_buf();
            }
        }
    }

    path
}

/// Copies a directory tree recursively from `src` to `dst`.
fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_recursive(&from, &to)?;
        } else {
            fs::copy(&from, &to)?;
        }
    }
    Ok(())
}

/// Determines whether a filesystem path is a critical system directory or filesystem root.
///
/// Prevents accidental deletion, modification, or exposure of vital operating system directories
/// in compliance with ISO/IEC 25010 and OWASP Desktop Security guidelines.
///
/// * `path`: Reference to the filesystem path to evaluate.
/// * Returns: `true` if the path is empty, a drive root (e.g. C:\ or /), or a protected
///   OS directory (Windows, Program Files, System32, /System, /bin, /usr, /etc);
///   `false` otherwise.
pub fn is_protected_system_path(path: &Path) -> bool {
    let raw = path.to_string_lossy().trim().to_string();
    if raw.is_empty() {
        return true;
    }

    // Direct root checks
    if path == Path::new("/") || path == Path::new("\\") {
        return true;
    }

    // Check if path components lack normal segments (e.g. only RootDir or Prefix)
    let has_normal = path
        .components()
        .any(|c| matches!(c, std::path::Component::Normal(_)));
    if !has_normal {
        return true;
    }

    let normalized = raw.replace('\\', "/");
    let trimmed = normalized.trim_end_matches('/');

    if trimmed.is_empty() {
        return true;
    }

    // Windows drive roots: e.g. "C:" or "c:"
    if (trimmed.len() == 2 && trimmed.ends_with(':'))
        || (trimmed.starts_with("//?/") && trimmed.len() == 6 && trimmed.ends_with(':'))
    {
        return true;
    }

    let lower = trimmed.to_lowercase();

    // Check Unix protected system roots and subdirectories
    let unix_protected = [
        "/system", "/bin", "/usr", "/etc", "/sbin", "/var", "/boot", "/dev", "/lib", "/lib64", "/root",
    ];
    for p in &unix_protected {
        if lower == *p || lower.starts_with(&format!("{p}/")) {
            return true;
        }
    }

    // Check Windows protected system directories
    let win_protected = [
        "windows",
        "program files",
        "program files (x86)",
        "system32",
        "programdata",
    ];

    // Check bare directory names (e.g. "Windows", "System32")
    for wp in &win_protected {
        if lower == *wp {
            return true;
        }
    }

    // Check drive-relative paths (e.g. "C:/Windows", "C:/Program Files", "C:/System32")
    let without_drive = if lower.len() >= 2 && lower.as_bytes()[1] == b':' {
        &lower[2..]
    } else {
        &lower[..]
    };
    let without_drive = without_drive.trim_start_matches('/');
    for wp in &win_protected {
        if without_drive == *wp || without_drive.starts_with(&format!("{wp}/")) {
            return true;
        }
    }

    // Check standard Windows environment directories if available
    #[cfg(target_os = "windows")]
    {
        for env_var in &["SystemRoot", "windir", "ProgramFiles", "ProgramFiles(x86)", "ProgramData"] {
            if let Ok(val) = std::env::var(env_var) {
                let val_path = PathBuf::from(&val);
                if path.starts_with(&val_path) || val_path.starts_with(path) {
                    return true;
                }
            }
        }
    }

    false
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri commands — isolated in their own module to avoid macro collisions
// ─────────────────────────────────────────────────────────────────────────────

mod commands {
    use super::*;

    /// Reads immediate contents of a directory (folders and files) without recursing,
    /// resolving any OneDrive folder redirection.
    ///
    /// * `dir_path`: Absolute path of the folder to inspect.
    /// * Returns: `DirContents` containing current path, parent path, folders, and files.
    #[tauri::command]
    pub fn read_folder_contents(dir_path: String) -> Result<DirContents, String> {
        let path = resolve_system_path(&dir_path);
        if !path.exists() {
            return Err(format!("Path does not exist: {dir_path}"));
        }
        if !path.is_dir() {
            return Err(format!("Not a directory: {dir_path}"));
        }

        let cache_key = path.to_string_lossy().to_lowercase().replace('/', "\\");

        // Fast path: Check in-memory cache (fresh within 3 seconds) for instant navigation
        if let Ok(cache) = get_dir_cache().lock() {
            if let Some((instant, cached_contents)) = cache.get(&cache_key) {
                if instant.elapsed().as_secs() < 3 {
                    return Ok(cached_contents.clone());
                }
            }
        }

        let parent_path = path.parent().map(|p| p.to_string_lossy().to_string());
        let mut folders: Vec<FolderEntry> = Vec::new();
        let mut files: Vec<FileEntry> = Vec::new();

        let entries = fs::read_dir(&path)
            .map_err(|e| format!("Cannot read directory '{}': {e}", path.display()))?;

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

        let result = DirContents {
            current_path: path.to_string_lossy().to_string(),
            parent_path,
            folders,
            files,
        };

        // Store in memory cache for subsequent instant access
        if let Ok(mut cache) = get_dir_cache().lock() {
            cache.insert(cache_key, (Instant::now(), result.clone()));
        }

        Ok(result)
    }

    /// Discovers system drives and standard Windows/macOS user folders, resolving OneDrive redirection.
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

        // 1b. Enumerate root drive and mounted volumes on macOS / Unix
        #[cfg(not(target_os = "windows"))]
        {
            items.push(QuickAccessItem {
                name: "Macintosh HD".to_string(),
                path: "/".to_string(),
                icon: "💾".to_string(),
                is_drive: true,
            });

            let volumes = Path::new("/Volumes");
            if volumes.is_dir() {
                if let Ok(entries) = std::fs::read_dir(volumes) {
                    for entry in entries.flatten() {
                        let p = entry.path();
                        if p.is_dir() {
                            let name = entry.file_name().to_string_lossy().to_string();
                            items.push(QuickAccessItem {
                                name,
                                path: p.to_string_lossy().to_string(),
                                icon: "💽".to_string(),
                                is_drive: true,
                            });
                        }
                    }
                }
            }
        }

        // 2. Discover standard user folders via USERPROFILE (Windows) or HOME (macOS/Unix)
        let home_opt = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .ok();

        if let Some(profile) = home_opt {
            let user_dir = PathBuf::from(&profile);
            let shortcuts = [
                ("Desktop", "Desktop", "🖥️"),
                ("Downloads", "Downloads", "📥"),
                ("Documents", "Documents", "📁"),
                ("Pictures", "Pictures", "🖼️"),
                ("Music", "Music", "🎵"),
                #[cfg(target_os = "macos")]
                ("Movies", "Movies", "🎬"),
                #[cfg(not(target_os = "macos"))]
                ("Videos", "Videos", "🎬"),
            ];

            for (label, sub, icon) in shortcuts {
                let direct = user_dir.join(sub);
                let od_direct = user_dir.join("OneDrive").join(sub);
                let od_env = std::env::var("OneDrive").ok().map(|o| PathBuf::from(o).join(sub));

                let resolved_path = if direct.is_dir() {
                    Some(direct.clone())
                } else if od_direct.is_dir() {
                    Some(od_direct)
                } else if let Some(ref p) = od_env {
                    if p.is_dir() {
                        Some(p.clone())
                    } else {
                        None
                    }
                } else {
                    None
                };

                let final_path = resolved_path.unwrap_or(direct);
                items.push(QuickAccessItem {
                    name: label.to_string(),
                    path: final_path.to_string_lossy().to_string(),
                    icon: icon.to_string(),
                    is_drive: false,
                });
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

    /// Launches a file using the OS default application.
    ///
    /// On Windows, invokes `ShellExecuteW` directly to avoid cmd.exe command injection vulnerabilities.
    ///
    /// * `path`: Full path to open.
    /// * Returns: Ok(()) on successful spawn or an error message.
    #[tauri::command]
    pub fn open_in_os(path: String) -> Result<(), String> {
        let p = Path::new(&path);
        if p.is_dir() {
            // Folders are navigated internally inside Foldy to prevent launching OS File Explorer
            return Err(format!("'{path}' is a folder; folders are browsed inside Foldy."));
        }

        #[cfg(target_os = "windows")]
        {
            use std::ffi::OsStr;
            use std::os::windows::ffi::OsStrExt;

            #[link(name = "shell32")]
            extern "system" {
                fn ShellExecuteW(
                    hwnd: *mut std::ffi::c_void,
                    lpOperation: *const u16,
                    lpFile: *const u16,
                    lpParameters: *const u16,
                    lpDirectory: *const u16,
                    nShowCmd: i32,
                ) -> *mut std::ffi::c_void;
            }

            // Normalize path separators to backslashes for Windows API
            let win_path = path.replace('/', "\\");
            let wide_path: Vec<u16> = OsStr::new(&win_path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            let wide_op: Vec<u16> = OsStr::new("open")
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            // ShellExecuteW returns a pseudo-HINSTANCE value > 32 on success.
            let res = unsafe {
                ShellExecuteW(
                    std::ptr::null_mut(),
                    wide_op.as_ptr(),
                    wide_path.as_ptr(),
                    std::ptr::null(),
                    std::ptr::null(),
                    1, // SW_SHOWNORMAL
                )
            };

            let code = res as usize;
            if code <= 32 {
                return Err(format!("Failed to open '{win_path}' via ShellExecuteW (code: {code})"));
            }
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

    /// Opens the native file manager (Windows File Explorer or macOS Finder) and reveals the item.
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

        #[cfg(target_os = "macos")]
        {
            Command::new("open")
                .args(["-R", &path])
                .spawn()
                .map_err(|e| format!("Failed to reveal '{path}': {e}"))?;
        }

        #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
        {
            let p = Path::new(&path);
            let dir = if p.is_dir() { p } else { p.parent().unwrap_or(p) };
            Self::open_in_os(dir.to_string_lossy().to_string())?;
        }

        Ok(())
    }

    /// Deletes a file or directory permanently after validating against system protection rules.
    ///
    /// * `path`: Path to delete.
    /// * Returns: Ok(()) or detailed error message.
    #[tauri::command]
    pub fn delete_item(path: String) -> Result<(), String> {
        let p = Path::new(&path);
        if is_protected_system_path(p) {
            return Err(format!("Operation denied: '{path}' is a protected system path."));
        }

        let resolved = resolve_system_path(&path);
        if is_protected_system_path(&resolved) {
            return Err(format!("Operation denied: '{path}' resolves to a protected system path."));
        }

        if !resolved.exists() {
            return Err(format!("Item not found: {path}"));
        }

        if resolved.is_dir() {
            fs::remove_dir_all(&resolved)
                .map_err(|e| format!("Cannot delete directory '{path}': {e}"))?;
        } else {
            fs::remove_file(&resolved)
                .map_err(|e| format!("Cannot delete file '{path}': {e}"))?;
        }

        if let Some(parent) = resolved.parent() {
            invalidate_dir_cache(Some(&parent.to_string_lossy()));
        } else {
            invalidate_dir_cache(None);
        }

        Ok(())
    }

    /// Moves a file or directory into a destination directory. Supports cross-device fallback.
    ///
    /// Prevents cyclic moves where a directory is moved into itself or its own subdirectories.
    ///
    /// * `source_path`: Absolute path of the item to move.
    /// * `dest_dir`: Absolute path of the destination folder.
    /// * Returns: `Ok(new_path)` on success, or detailed error string.
    #[tauri::command]
    pub fn move_item(source_path: String, dest_dir: String) -> Result<String, String> {
        let src = resolve_system_path(&source_path);
        let dest_folder = resolve_system_path(&dest_dir);

        if !src.exists() {
            return Err(format!("Source does not exist: {source_path}"));
        }
        if !dest_folder.is_dir() {
            return Err(format!("Destination is not a directory: {dest_dir}"));
        }

        if src.is_dir() && dest_folder.starts_with(&src) {
            return Err("Cannot move a directory into itself or one of its subdirectories.".to_string());
        }

        let file_name = src
            .file_name()
            .ok_or_else(|| "Cannot get filename from source".to_string())?;
        let target_path = dest_folder.join(file_name);

        if target_path == src {
            return Ok(target_path.to_string_lossy().to_string());
        }

        if target_path.exists() {
            return Err(format!(
                "An item named '{}' already exists in '{}'",
                file_name.to_string_lossy(),
                dest_dir
            ));
        }

        // Try fast atomic rename first
        if fs::rename(&src, &target_path).is_ok() {
            invalidate_dir_cache(None);
            return Ok(target_path.to_string_lossy().to_string());
        }

        // Cross-device fallback: copy then remove
        if src.is_file() {
            fs::copy(&src, &target_path)
                .map_err(|e| format!("Failed to copy file: {e}"))?;
            let _ = fs::remove_file(&src);
        } else {
            copy_dir_recursive(&src, &target_path)
                .map_err(|e| format!("Failed to copy directory: {e}"))?;
            let _ = fs::remove_dir_all(&src);
        }

        invalidate_dir_cache(None);
        Ok(target_path.to_string_lossy().to_string())
    }

    /// Discovers recent files across standard user folders sorted newest first.
    ///
    /// * Returns: List of `FileEntry` items sorted by modified date.
    #[tauri::command]
    pub fn get_recent_files() -> Result<Vec<FileEntry>, String> {
        let mut results: Vec<FileEntry> = Vec::new();
        let mut seen_paths: std::collections::HashSet<String> = std::collections::HashSet::new();

        let home_opt = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .ok();

        if let Some(profile) = home_opt {
            let user_dir = PathBuf::from(profile);
            let subdirs = ["Downloads", "Desktop", "Documents", "Pictures"];
            for sub in subdirs {
                let resolved = resolve_system_path(&user_dir.join(sub).to_string_lossy());
                if resolved.is_dir() {
                    if let Ok(entries) = fs::read_dir(&resolved) {
                        for entry in entries.flatten() {
                            let p = entry.path();
                            if p.is_file() {
                                if let Ok(meta) = p.metadata() {
                                    let path_str = p.to_string_lossy().to_string();
                                    if seen_paths.insert(path_str.to_lowercase()) {
                                        let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                                        let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                                        results.push(FileEntry {
                                            path: path_str,
                                            name,
                                            extension: ext,
                                            size: meta.len(),
                                            created_at: format_time(meta.created().ok()),
                                            modified_at: format_time(meta.modified().ok()),
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        results.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
        results.truncate(80);

        Ok(results)
    }

    /// Recursively reads all files under `dir_path` for recursive bulk operations.
    ///
    /// * `dir_path`: Root folder path.
    /// * Returns: Flat list of FileEntry items.
    #[tauri::command]
    pub fn scan_directory(dir_path: String) -> Result<Vec<FileEntry>, String> {
        let root = resolve_system_path(&dir_path);
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

        let home_opt = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .ok();

        if let Some(profile) = home_opt {
            let user_dir = PathBuf::from(profile);
            let subdirs = [
                "Desktop", "Downloads", "Documents", "Pictures", "Music", "Videos", "Movies",
            ];
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

        #[cfg(target_os = "macos")]
        {
            let vol = PathBuf::from("/Volumes");
            if vol.is_dir() && !search_roots.contains(&vol) {
                search_roots.push(vol);
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

                    let extension = if meta.is_dir() {
                        "folder".to_string()
                    } else {
                        path.extension()
                            .and_then(|e| e.to_str())
                            .unwrap_or("")
                            .to_lowercase()
                    };

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
        if let Some(parent) = p.parent() {
            invalidate_dir_cache(Some(&parent.to_string_lossy()));
        } else {
            invalidate_dir_cache(None);
        }
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

    /// Returns the signed-in user account username and display name instantly without spawning PowerShell.
    ///
    /// * Returns: `SystemUserInfo` with username and display_name.
    #[tauri::command]
    pub fn get_system_user() -> Result<SystemUserInfo, String> {
        let username = std::env::var("USERNAME")
            .or_else(|_| std::env::var("USER"))
            .unwrap_or_else(|_| "User".to_string());
        let mut display_name = username.clone();

        #[cfg(target_os = "windows")]
        {
            // Query local user full name via native Win32 GetUserNameExW from secur32.dll
            // (0.01ms execution time, completely removes the 2-second PowerShell cold-start delay)
            #[link(name = "secur32")]
            extern "system" {
                fn GetUserNameExW(name_format: i32, buffer: *mut u16, size: *mut u32) -> i32;
            }

            // NameDisplay = 3 (returns e.g. "Raynald Gitau")
            let mut buf = vec![0u16; 256];
            let mut size = buf.len() as u32;
            let ret = unsafe { GetUserNameExW(3, buf.as_mut_ptr(), &mut size) };
            if ret != 0 && size > 0 {
                use std::os::windows::ffi::OsStringExt;
                let full = std::ffi::OsString::from_wide(&buf[..size as usize])
                    .to_string_lossy()
                    .trim()
                    .to_string();
                if !full.is_empty() {
                    display_name = full;
                }
            }
        }

        #[cfg(target_os = "macos")]
        {
            // 'id -F' outputs the full display name of the current user on macOS
            let output = Command::new("id").arg("-F").output();
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

    /// Returns real-time disk storage metrics (total, free, used, percent) for a drive or folder path.
    ///
    /// * `path`: Optional folder or drive path. Defaults to system drive root ("C:\\" or "/").
    /// * Returns: `DiskUsage` with formatted and raw byte metrics.
    #[tauri::command]
    pub fn get_disk_usage(path: Option<String>) -> Result<DiskUsage, String> {
        get_disk_usage_impl(path)
    }

    /// Opens a new Foldy application window.
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
            .title("Foldy")
            .inner_size(1280.0, 800.0)
            .min_inner_size(420.0, 360.0)
            .build()
            .map_err(|e| format!("Failed to create window: {}", e))?;
        Ok(())
    }

    /// Safely reads the text content of a file for fast in-app preview up to max_bytes (default 256KB).
    ///
    /// * `path`: Full path of the file to preview.
    /// * `max_bytes`: Optional maximum bytes to read to prevent memory spikes.
    /// * Returns: UTF-8 string content or error string.
    #[tauri::command]
    pub fn read_file_text_preview(path: String, max_bytes: Option<usize>) -> Result<String, String> {
        let p = Path::new(&path);
        if !p.is_file() {
            return Err(format!("Target is not a readable file: {path}"));
        }
        let limit = max_bytes.unwrap_or(256 * 1024);
        let mut file = fs::File::open(p).map_err(|e| format!("Cannot open file: {e}"))?;
        let mut chunk = vec![0u8; limit];
        use std::io::Read;
        let bytes_read = file.read(&mut chunk).map_err(|e| format!("Cannot read file: {e}"))?;
        let lossy = String::from_utf8_lossy(&chunk[..bytes_read]).to_string();
        Ok(lossy)
    }
}

/// Queries the real filesystem storage metrics for the drive containing `path`.
#[cfg(target_os = "windows")]
fn get_disk_usage_impl(path: Option<String>) -> Result<DiskUsage, String> {
    use std::os::windows::ffi::OsStrExt;

    #[link(name = "kernel32")]
    extern "system" {
        fn GetDiskFreeSpaceExW(
            lpDirectoryName: *const u16,
            lpFreeBytesAvailableToCaller: *mut u64,
            lpTotalNumberOfBytes: *mut u64,
            lpTotalNumberOfFreeBytes: *mut u64,
        ) -> i32;
    }

    let raw_target = path.unwrap_or_else(|| "C:\\".to_string());
    let target = if raw_target.is_empty() || raw_target == "recents" {
        "C:\\".to_string()
    } else {
        raw_target
    };

    let p = Path::new(&target);
    let drive_root = if let Some(prefix) = p.components().next() {
        let s = prefix.as_os_str().to_string_lossy().to_string();
        if s.ends_with('\\') || s.ends_with('/') {
            s
        } else {
            format!("{s}\\")
        }
    } else {
        "C:\\".to_string()
    };

    let mut wide: Vec<u16> = Path::new(&drive_root).as_os_str().encode_wide().collect();
    wide.push(0);

    let mut free_available: u64 = 0;
    let mut total: u64 = 0;
    let mut total_free: u64 = 0;

    let success = unsafe {
        GetDiskFreeSpaceExW(
            wide.as_ptr(),
            &mut free_available,
            &mut total,
            &mut total_free,
        )
    };

    if success != 0 && total > 0 {
        let used = total.saturating_sub(free_available);
        let pct = (used as f64 / total as f64) * 100.0;
        let drive_clean = drive_root.trim_end_matches('\\').to_uppercase();
        let drive_name = if drive_clean.len() == 2 && drive_clean.ends_with(':') {
            format!("Local Disk ({drive_clean})")
        } else {
            format!("Local Disk ({drive_root})")
        };

        Ok(DiskUsage {
            drive_name,
            mount_path: drive_root,
            total_bytes: total,
            free_bytes: free_available,
            used_bytes: used,
            used_percentage: (pct * 10.0).round() / 10.0,
            total_formatted: format_bytes(total),
            free_formatted: format_bytes(free_available),
            used_formatted: format_bytes(used),
        })
    } else {
        Err(format!("Could not retrieve storage metrics for '{drive_root}'"))
    }
}

/// Queries the real filesystem storage metrics on macOS / Unix.
#[cfg(not(target_os = "windows"))]
fn get_disk_usage_impl(path: Option<String>) -> Result<DiskUsage, String> {
    use std::ffi::CString;
    use std::process::Command;

    let raw_target = path.unwrap_or_else(|| "/".to_string());
    let target = if raw_target.is_empty() || raw_target == "recents" {
        "/".to_string()
    } else {
        raw_target
    };

    // 1. Primary: Use 'df -k <target>' which accurately resolves Apple APFS containers,
    // purgeable storage, system snapshots, and mounted external drives on macOS.
    if let Ok(output) = Command::new("df").args(["-k", &target]).output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = stdout.lines().collect();
            if lines.len() >= 2 {
                let data_line = lines[1];
                let tokens: Vec<&str> = data_line.split_whitespace().collect();
                if tokens.len() >= 4 {
                    let total_kib = tokens[1].parse::<u64>().unwrap_or(0);
                    let used_kib = tokens[2].parse::<u64>().unwrap_or(0);
                    let avail_kib = tokens[3].parse::<u64>().unwrap_or(0);

                    if total_kib > 0 {
                        let total_bytes = total_kib.saturating_mul(1024);
                        let used_bytes = used_kib.saturating_mul(1024);
                        let free_bytes = avail_kib.saturating_mul(1024);
                        let pct = (used_bytes as f64 / total_bytes as f64) * 100.0;

                        let mount_path = tokens.last().copied().unwrap_or("/").to_string();
                        let drive_name = if mount_path == "/" || mount_path.starts_with("/System/Volumes/") {
                            "Macintosh HD".to_string()
                        } else if mount_path.starts_with("/Volumes/") {
                            mount_path.split('/').nth(2).unwrap_or("External Drive").to_string()
                        } else {
                            mount_path.split('/').filter(|s| !s.is_empty()).last().unwrap_or("Macintosh HD").to_string()
                        };

                        return Ok(DiskUsage {
                            drive_name,
                            mount_path,
                            total_bytes,
                            free_bytes,
                            used_bytes,
                            used_percentage: (pct * 10.0).round() / 10.0,
                            total_formatted: format_bytes(total_bytes),
                            free_formatted: format_bytes(free_bytes),
                            used_formatted: format_bytes(used_bytes),
                        });
                    }
                }
            }
        }
    }

    // 2. Fallback: Query POSIX statvfs
    #[repr(C)]
    struct StatVfs {
        f_bsize: std::os::raw::c_ulong,
        f_frsize: std::os::raw::c_ulong,
        f_blocks: u64,
        f_bfree: u64,
        f_bavail: u64,
        f_files: u64,
        f_ffree: u64,
        f_favail: u64,
        f_fsid: std::os::raw::c_ulong,
        f_flag: std::os::raw::c_ulong,
        f_namemax: std::os::raw::c_ulong,
        _padding: [std::os::raw::c_int; 32],
    }

    extern "C" {
        fn statvfs(path: *const std::os::raw::c_char, buf: *mut StatVfs) -> std::os::raw::c_int;
    }

    let c_path = CString::new(target.as_bytes()).map_err(|e| e.to_string())?;
    let mut stat: StatVfs = unsafe { std::mem::zeroed() };
    if unsafe { statvfs(c_path.as_ptr(), &mut stat) } == 0 {
        let block_size = if stat.f_frsize > 0 { stat.f_frsize as u64 } else { stat.f_bsize as u64 };
        let total = stat.f_blocks * block_size;
        let free = stat.f_bavail * block_size;
        if total > 0 {
            let used = total.saturating_sub(free);
            let pct = (used as f64 / total as f64) * 100.0;
            let drive_name = if target.starts_with("/Volumes/") {
                target.split('/').nth(2).unwrap_or("External Drive").to_string()
            } else {
                "Macintosh HD".to_string()
            };
            return Ok(DiskUsage {
                drive_name,
                mount_path: target,
                total_bytes: total,
                free_bytes: free,
                used_bytes: used,
                used_percentage: (pct * 10.0).round() / 10.0,
                total_formatted: format_bytes(total),
                free_formatted: format_bytes(free),
                used_formatted: format_bytes(used),
            });
        }
    }
    Err("Could not retrieve disk space".to_string())
}

/// Pre-warms the in-memory directory cache in a background worker with zero UI thread contention.
fn prewarm_quick_access_cache() {
    let home_opt = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok();

    if let Some(profile) = home_opt {
        let user_dir = PathBuf::from(&profile);
        let targets = ["Downloads", "Desktop", "Documents", "Pictures"];
        for sub in targets {
            let direct = user_dir.join(sub);
            if direct.is_dir() {
                let _ = commands::read_folder_contents(direct.to_string_lossy().to_string());
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            // Background thread to pre-warm directory cache with zero UI delay
            std::thread::spawn(|| {
                prewarm_quick_access_cache();
            });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::read_folder_contents,
            commands::get_quick_access,
            commands::get_system_user,
            commands::get_disk_usage,
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
            commands::move_item,
            commands::get_recent_files,
            commands::read_file_text_preview,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Tests that resolve_system_path correctly resolves paths.
    ///
    /// * Returns: Nothing (`()`). Panics on assertion failure.
    #[test]
    fn test_resolve_system_path() {
        let current_dir = std::env::current_dir().unwrap();
        let resolved = resolve_system_path(&current_dir.to_string_lossy());
        assert!(resolved.exists());

        // Test bare name resolution for Desktop and Photos/Pictures
        let desk = resolve_system_path("Desktop");
        assert!(desk.exists(), "Desktop should resolve to an existing folder: {:?}", desk);

        let pics = resolve_system_path("Pictures");
        assert!(pics.exists(), "Pictures should resolve to an existing folder: {:?}", pics);

        let photos = resolve_system_path("Photos");
        assert!(photos.exists(), "Photos should resolve to an existing folder: {:?}", photos);

        let recents = commands::get_recent_files().unwrap();
        println!("Recent files discovered: {}", recents.len());
        assert!(!recents.is_empty(), "Should discover recent files across user folders");
    }

    /// Verifies that `is_protected_system_path` properly rejects root and protected OS directories.
    ///
    /// * Returns: Nothing (`()`). Panics on assertion failure.
    #[test]
    fn test_is_protected_system_path() {
        // Empty paths must be blocked
        assert!(is_protected_system_path(Path::new("")));

        // Root paths must be blocked
        assert!(is_protected_system_path(Path::new("/")));
        assert!(is_protected_system_path(Path::new("\\")));
        assert!(is_protected_system_path(Path::new("C:")));
        assert!(is_protected_system_path(Path::new("C:\\")));
        assert!(is_protected_system_path(Path::new("c:/")));
        assert!(is_protected_system_path(Path::new("D:\\")));

        // Protected Windows system directories must be blocked
        assert!(is_protected_system_path(Path::new("C:\\Windows")));
        assert!(is_protected_system_path(Path::new("C:\\Windows\\System32")));
        assert!(is_protected_system_path(Path::new("C:\\Program Files")));
        assert!(is_protected_system_path(Path::new("C:\\Program Files (x86)")));
        assert!(is_protected_system_path(Path::new("C:/Windows/System32/drivers")));
        assert!(is_protected_system_path(Path::new("Windows")));
        assert!(is_protected_system_path(Path::new("System32")));
        assert!(is_protected_system_path(Path::new("Program Files")));

        // Protected Unix system directories must be blocked
        assert!(is_protected_system_path(Path::new("/System")));
        assert!(is_protected_system_path(Path::new("/bin")));
        assert!(is_protected_system_path(Path::new("/usr")));
        assert!(is_protected_system_path(Path::new("/etc")));
        assert!(is_protected_system_path(Path::new("/etc/shadow")));

        // User directories and arbitrary non-system files must NOT be blocked
        assert!(!is_protected_system_path(Path::new("C:\\Users\\User\\Documents")));
        assert!(!is_protected_system_path(Path::new("C:\\Users\\User\\Downloads\\report.pdf")));
        assert!(!is_protected_system_path(Path::new("/home/user/documents")));
    }

    /// Verifies that `format_bytes` accurately converts byte counts into formatted KB, MB, GB, and TB strings.
    ///
    /// * Returns: Nothing (`()`). Panics on assertion failure.
    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(0), "0 KB");
        assert_eq!(format_bytes(1024), "1 KB");
        assert_eq!(format_bytes(500 * 1024), "500 KB");
        assert_eq!(format_bytes(1024 * 1024), "1 MB");
        assert_eq!(format_bytes(1024 * 1024 * 1024), "1 GB");
        assert_eq!(format_bytes(1024 * 1024 * 1024 * 1024), "1.0 TB");
        assert_eq!(format_bytes((1.5 * 1024.0 * 1024.0 * 1024.0 * 1024.0) as u64), "1.5 TB");
    }

    /// Verifies that rename pattern transformation rules behave deterministically and sanitize invalid patterns.
    ///
    /// * Returns: Nothing (`()`). Panics on assertion failure.
    #[test]
    fn test_rename_rules_sanitization() {
        let rules = RenameRules {
            trim_whitespace: true,
            to_lowercase: true,
            to_uppercase: false,
            strip_prefix: Some("draft_".to_string()),
            strip_suffix: Some("_old".to_string()),
            replace_spaces_with: Some("-".to_string()),
            find_pattern: Some(r"run\d+".to_string()),
            replace_pattern: Some("experiment".to_string()),
            prepend_text: Some("final_".to_string()),
            append_text: Some("_v1".to_string()),
            add_date_prefix: false,
        };

        // "  draft_my run42 data_old  "
        // 1. trim -> "draft_my run42 data_old"
        // 2. lowercase -> "draft_my run42 data_old"
        // 3. strip prefix -> "my run42 data_old"
        // 4. strip suffix -> "my run42 data"
        // 5. replace spaces -> "my-run42-data"
        // 6. regex replacement -> "my-experiment-data"
        // 7. prepend -> "final_my-experiment-data"
        // 8. append -> "final_my-experiment-data_v1"
        let transformed = apply_rules_to_stem("  draft_my run42 data_old  ", &rules)
            .expect("Valid rule set should succeed");
        assert_eq!(transformed, "final_my-experiment-data_v1");

        // Verify invalid regex pattern returns Err
        let malformed_rules = RenameRules {
            trim_whitespace: false,
            to_lowercase: false,
            to_uppercase: false,
            strip_prefix: None,
            strip_suffix: None,
            replace_spaces_with: None,
            find_pattern: Some("([unclosed_regex".to_string()),
            replace_pattern: Some("".to_string()),
            prepend_text: None,
            append_text: None,
            add_date_prefix: false,
        };
        assert!(apply_rules_to_stem("filename", &malformed_rules).is_err());
    }

    /// Verifies that `UndoBatch` and `UndoEntry` serialize to and deserialize from JSON safely.
    ///
    /// * Returns: Nothing (`()`). Panics on assertion failure.
    #[test]
    fn test_undo_batch_serialization() {
        let batch = UndoBatch {
            timestamp: "2026-10-15T03:30:00".to_string(),
            operations: vec![
                UndoEntry {
                    original_path: "C:\\Folder\\file_a.txt".to_string(),
                    new_path: "C:\\Folder\\renamed_a.txt".to_string(),
                },
                UndoEntry {
                    original_path: "C:\\Folder\\file_b.txt".to_string(),
                    new_path: "C:\\Folder\\renamed_b.txt".to_string(),
                },
            ],
        };

        let serialized = serde_json::to_string(&batch)
            .expect("UndoBatch serialization should succeed");
        assert!(serialized.contains("renamed_a.txt"));

        let deserialized: UndoBatch = serde_json::from_str(&serialized)
            .expect("UndoBatch deserialization should succeed");
        assert_eq!(deserialized.timestamp, batch.timestamp);
        assert_eq!(deserialized.operations.len(), 2);
        assert_eq!(deserialized.operations[0].original_path, "C:\\Folder\\file_a.txt");
        assert_eq!(deserialized.operations[0].new_path, "C:\\Folder\\renamed_a.txt");
        assert_eq!(deserialized.operations[1].original_path, "C:\\Folder\\file_b.txt");
        assert_eq!(deserialized.operations[1].new_path, "C:\\Folder\\renamed_b.txt");
    }

    /// Verifies that `read_file_text_preview` reads file contents safely and respects the byte limit.
    ///
    /// * Returns: Nothing (`()`). Panics on assertion failure.
    #[test]
    fn test_read_file_text_preview() {
        use std::io::Write;
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("foldy_test_preview.txt");
        let content = "Hello Foldy Preview World!";
        let mut f = fs::File::create(&test_file).expect("Failed to create test file");
        f.write_all(content.as_bytes()).expect("Failed to write to test file");
        drop(f);

        // Test normal reading
        let read_back = commands::read_file_text_preview(test_file.to_string_lossy().to_string(), None)
            .expect("Should read file preview");
        assert_eq!(read_back, content);

        // Test reading with byte limit
        let limited = commands::read_file_text_preview(test_file.to_string_lossy().to_string(), Some(5))
            .expect("Should read file preview with limit");
        assert_eq!(limited, "Hello");

        // Test non-existent file returns error
        let not_found = commands::read_file_text_preview("non_existent_file_path_12345.txt".to_string(), None);
        assert!(not_found.is_err());

        // Cleanup
        let _ = fs::remove_file(&test_file);
    }
}
