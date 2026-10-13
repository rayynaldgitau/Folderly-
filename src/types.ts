/**
 * Shared TypeScript types mirroring the Rust data structures and UI state.
 * Keep in sync with src-tauri/src/main.rs.
 */

/** Metadata for a single file returned by scan_directory or read_folder_contents. */
export interface FileEntry {
  path: string;
  name: string;
  extension: string;
  size: number;       // bytes
  created_at: string; // ISO-8601
  modified_at: string;
}

/** Metadata for a directory entry when browsing in Explorer mode. */
export interface FolderEntry {
  path: string;
  name: string;
  modified_at: string;
}

/** Complete contents of a folder for interactive directory navigation. */
export interface DirContents {
  current_path: string;
  parent_path: string | null;
  folders: FolderEntry[];
  files: FileEntry[];
}

/** Quick Access item for drives and common locations. */
export interface QuickAccessItem {
  name: string;
  path: string;
  icon: string;
  is_drive: boolean;
}

/** Supported visual display modes in the main workspace. */
export type ViewMode = "cards" | "details" | "grid";

/** Supported visual themes including dark OLED pink and light pink. */
export type ThemeMode = "pink" | "pink_light" | "material" | "apple" | "dark";

/** Side where the renamer drawer is positioned. */
export type DrawerPosition = "left" | "right";

/** Sorting field for items. */
export type SortField = "name" | "date" | "size" | "type";

/** One rename operation preview returned by preview_renames. */
export interface RenamePreview {
  original_path: string;
  new_path: string;
  conflict: boolean;
}

/** Transformation rules sent to preview_renames / commit_renames. */
export interface RenameRules {
  replace_spaces_with: string;
  add_date_prefix: boolean;
  find_pattern: string;
  replace_pattern: string;
  to_lowercase: boolean;
  to_uppercase: boolean;
  trim_whitespace: boolean;
  strip_prefix: string;
  strip_suffix: string;
  append_text: string;
  prepend_text: string;
}

/** Signed-in system user information returned by get_system_user. */
export interface SystemUserInfo {
  username: string;
  display_name: string;
}

/** Represents an active browser/explorer tab within Foldy. */
export interface TabItem {
  /** Unique ID for the tab instance. */
  id: string;
  /** Display title of the tab (e.g. folder name or "Home"). */
  title: string;
  /** Filesystem path currently loaded in this tab, or null / "recents". */
  path: string | null;
  /** Navigation history stack for this tab. */
  history: string[];
  /** Current index in the navigation history stack. */
  historyIndex: number;
}
