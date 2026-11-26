import React, { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FileEntry } from "../types";
import { MacFolderIcon, MacFileIcon } from "./MacIcons";

/**
 * Props accepted by the {@link UniversalSearchModal} component.
 */
export interface UniversalSearchModalProps {
  /** Whether the modal dialog is currently visible. */
  isOpen: boolean;
  /** Callback invoked to close the modal dialog. */
  onClose: () => void;
  /** Callback invoked when browsing/navigating into a folder. */
  onNavigateFolder: (path: string) => void;
  /** Callback invoked when launching or opening a file. */
  onOpenFile: (path: string) => void;
  /** Callback invoked to reveal a file or directory in the native OS file explorer. */
  onShowInFileManager: (path: string) => void;
}

/**
 * Extension-to-emoji mapping for quick visual recognition of file types.
 */
const EXT_ICON_MAP: Record<string, string> = {
  pdf: "📄",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  gif: "🖼️",
  webp: "🖼️",
  svg: "🖼️",
  ico: "🖼️",
  mp3: "🎵",
  wav: "🎵",
  flac: "🎵",
  ogg: "🎵",
  m4a: "🎵",
  mp4: "🎬",
  mov: "🎬",
  mkv: "🎬",
  avi: "🎬",
  webm: "🎬",
  zip: "🗜️",
  rar: "🗜️",
  "7z": "🗜️",
  tar: "🗜️",
  gz: "🗜️",
  js: "📜",
  jsx: "📜",
  ts: "📜",
  tsx: "📜",
  rs: "🦀",
  py: "🐍",
  html: "🌐",
  css: "🎨",
  scss: "🎨",
  md: "📝",
  txt: "📝",
  log: "📝",
  csv: "📊",
  json: "📊",
  xml: "📊",
  doc: "📃",
  docx: "📃",
  xls: "📊",
  xlsx: "📊",
  ppt: "📊",
  pptx: "📊",
  exe: "⚙️",
  msi: "⚙️",
  bat: "⚙️",
  cmd: "⚙️",
  ps1: "⚙️",
  sh: "⚙️",
};

/**
 * Formats a file size in bytes into a human-readable string (B, KB, MB, GB).
 *
 * @param bytes - Size in bytes.
 * @returns Human-readable size string or "-" if not available.
 */
export function formatSize(bytes: number): string {
  if (bytes == null || isNaN(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/**
 * Formats an ISO-8601 date string into a user-friendly date representation.
 *
 * @param dateStr - The raw date string.
 * @returns Formatted date representation or fallback placeholder.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Resolves the visual emoji icon for an entry based on its extension or directory nature.
 *
 * @param extension - File extension without leading dot.
 * @param isFolder - Whether the item is a folder.
 * @returns Emoji icon representing the item type.
 */
export function getItemIcon(extension: string, isFolder: boolean): string {
  if (isFolder || extension.toLowerCase() === "folder") {
    return "📁";
  }
  const ext = extension.toLowerCase().replace(/^\./, "");
  return EXT_ICON_MAP[ext] ?? "📄";
}

/**
 * Resolves the parent directory path from a given filesystem path.
 *
 * @param fullPath - Absolute filesystem path.
 * @returns The directory path containing the file, or the root directory.
 */
export function getParentPath(fullPath: string): string {
  if (!fullPath) return "";
  const trimmed = fullPath.replace(/[/\\]+$/, "");
  const lastIndex = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  if (lastIndex === -1) {
    return fullPath;
  }
  if (lastIndex === 2 && trimmed[1] === ":") {
    return trimmed.slice(0, 3);
  }
  if (lastIndex === 0) {
    return "/";
  }
  return trimmed.slice(0, lastIndex);
}

/**
 * Highlights matches of the query string within the target name text.
 *
 * @param text - Full file or folder name.
 * @param query - Search query substring to highlight.
 * @returns Renderable React node array with highlighted matches.
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <span
        key={index}
        className="font-semibold text-pink-400 bg-pink-500/20 rounded px-0.5"
      >
        {part}
      </span>
    ) : (
      part
    )
  );
}

/**
 * UniversalSearchModal Component.
 *
 * A Spotlight / Command Palette modal dialog overlay with backdrop blur for
 * instant universal searching across laptop storage drives and user directories.
 */
export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateFolder,
  onOpenFile,
  onShowInFileManager,
}) => {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input and reset query when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      setSelectedIndex(0);

      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen]);

  // Listen for Escape key to close the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search logic (250ms)
  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      setSelectedIndex(0);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const matches = await invoke<FileEntry[]>("universal_search", {
          query: trimmed,
          maxResults: 150,
        });
        setResults(matches || []);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Universal search invocation error:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
        setHasSearched(true);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle keyboard navigation (Arrow Up, Arrow Down, Enter)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          const isFolder = selected.extension.toLowerCase() === "folder" || !selected.extension;
          if (isFolder) {
            onNavigateFolder(selected.path);
          } else {
            onOpenFile(selected.path);
          }
          onClose();
        }
      }
    },
    [results, selectedIndex, onNavigateFolder, onOpenFile, onClose]
  );

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      ) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // If modal is not open, do not render into DOM
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="universal-search-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col rounded-m3-xl shadow-m3-3 bg-surface-container-high text-on-surface overflow-hidden animate-m3-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 bg-surface-container">
          <div className="text-on-surface-variant shrink-0 select-none">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            ref={inputRef}
            id="universal-search-title"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files, folders across your laptop... (e.g. resume, invoice, .png)"
            className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant/70 text-sm md:text-base outline-none border-none focus:ring-0"
            autoComplete="off"
            spellCheck={false}
          />

          {isLoading && (
            <div
              className="text-primary shrink-0 animate-spin"
              title="Searching laptop files..."
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            </div>
          )}

          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-m3-full hover:bg-surface-container-highest m3-pressable"
              title="Clear search"
              aria-label="Clear search query"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 min-h-[32px] text-xs text-on-surface-variant hover:text-on-surface bg-surface-container-highest rounded-m3-xs m3-pressable"
            title="Close modal (Esc)"
            aria-label="Close search modal"
          >
            <span>Esc</span>
          </button>
        </div>

        {/* Results Container */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto max-h-[60vh] p-2 space-y-1"
        >
          {!query.trim() && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-on-surface-variant">
              <p className="text-sm font-medium text-on-surface">
                Type a keyword to search your whole laptop
              </p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
                Instant search across your Desktop, Documents, Downloads, and internal drives.
              </p>
            </div>
          )}

          {query.trim().length > 0 && !isLoading && results.length === 0 && hasSearched && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-on-surface-variant">
              <p className="text-sm font-medium text-on-surface">No matches found</p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-xs truncate">
                No files or directories matching &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {/* Matches List */}
          {results.map((item, index) => {
            const isFolder = item.extension.toLowerCase() === "folder" || !item.extension;
            const parentPath = getParentPath(item.path);
            const isSelected = index === selectedIndex;

            return (
              <div
                key={`${item.path}-${index}`}
                data-index={index}
                onClick={() => {
                  if (isFolder) {
                    onNavigateFolder(item.path);
                  } else {
                    onOpenFile(item.path);
                  }
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`group flex items-center justify-between p-2.5 rounded-m3-md cursor-pointer transition-colors duration-150 select-none ${
                  isSelected
                    ? "bg-secondary-container text-on-secondary-container"
                    : "hover:bg-surface-container text-on-surface"
                }`}
              >
                {/* Left side: Icon, Name, and Parent directory */}
                <div className="flex items-center gap-3 min-w-0 mr-3">
                  <span className="shrink-0 flex items-center justify-center">
                    {isFolder ? (
                      <MacFolderIcon size={22} />
                    ) : (
                      <MacFileIcon extension={item.extension} size={22} />
                    )}
                  </span>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-sm font-medium text-on-surface truncate">
                      {highlightMatch(item.name, query)}
                    </span>
                    <span
                      className="text-xs text-on-surface-variant truncate max-w-md"
                      title={parentPath}
                    >
                      {parentPath}
                    </span>
                  </div>
                </div>

                {/* Right side: Size & Date / Hover Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Default Info: Size & Date */}
                  <div className="text-right text-xs text-on-surface-variant group-hover:hidden hidden sm:flex flex-col items-end">
                    <span>{isFolder ? "Folder" : formatSize(item.size)}</span>
                    <span className="text-[11px] opacity-80">
                      {formatDate(item.modified_at)}
                    </span>
                  </div>

                  {/* Hover Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      type="button"
                      title={isFolder ? "Open folder in Foldy" : "Open file"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFolder) {
                          onNavigateFolder(item.path);
                        } else {
                          onOpenFile(item.path);
                        }
                        onClose();
                      }}
                      className="px-2.5 min-h-[32px] text-xs font-medium rounded-m3-full bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface transition-colors"
                    >
                      {isFolder ? "Open Folder" : "Open"}
                    </button>

                    <button
                      type="button"
                      title="Browse parent folder"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateFolder(parentPath);
                        onClose();
                      }}
                      className="px-2.5 min-h-[32px] text-xs font-medium rounded-m3-full bg-surface-container-highest hover:bg-surface-container text-on-surface transition-colors"
                    >
                      Parent
                    </button>

                    <button
                      type="button"
                      title="Show in File Manager"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowInFileManager(item.path);
                      }}
                      className="px-2.5 min-h-[32px] text-xs font-medium rounded-m3-full bg-surface-container-highest hover:bg-surface-container text-on-surface transition-colors"
                    >
                      Reveal
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer / Shortcuts guide */}
        <div className="flex items-center justify-between px-4 py-2.5 text-xs text-on-surface-variant bg-surface-container select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-m3-xs bg-surface-container-high text-on-surface font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded-m3-xs bg-surface-container-high text-on-surface font-mono text-[10px]">
                ↓
              </kbd>
              <span className="ml-0.5">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-m3-xs bg-surface-container-high text-on-surface font-mono text-[10px]">
                ↵
              </kbd>
              <span className="ml-0.5">Open</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-m3-xs bg-surface-container-high text-on-surface font-mono text-[10px]">
                Esc
              </kbd>
              <span className="ml-0.5">Close</span>
            </span>
          </div>

          <div>
            {results.length > 0 && (
              <span className="text-on-surface-variant font-medium">
                {results.length} match{results.length === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversalSearchModal;
