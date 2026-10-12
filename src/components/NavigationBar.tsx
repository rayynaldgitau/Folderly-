import React, { useState, useEffect, useRef, useMemo } from "react";
import type { ViewMode, DrawerPosition, SortField } from "../types";

/**
 * Properties for the NavigationBar component.
 */
export interface NavigationBarProps {
  /** The currently selected directory path on the filesystem. */
  currentPath: string | null;
  /** Whether navigation history has an item to go back to. */
  canGoBack: boolean;
  /** Whether navigation history has an item to go forward to. */
  canGoForward: boolean;
  /** Whether navigating up to the parent directory is valid. */
  canGoUp: boolean;
  /** Callback invoked when the user clicks the back button. */
  onGoBack: () => void;
  /** Callback invoked when the user clicks the forward button. */
  onGoForward: () => void;
  /** Callback invoked when the user clicks the up/parent directory button. */
  onGoUp: () => void;
  /** Callback invoked when the user clicks the refresh button. */
  onRefresh: () => void;
  /** Callback invoked when a breadcrumb segment or manually typed path is selected. */
  onNavigate: (path: string) => void;
  /** Current live search filter query string. */
  searchQuery: string;
  /** Callback invoked when the live search filter input changes. */
  onSearchChange: (q: string) => void;
  /** Currently active file display mode (cards, details, or grid). */
  viewMode: ViewMode;
  /** Callback invoked when the view mode is changed. */
  onViewModeChange: (mode: ViewMode) => void;
  /** Whether directory scanning is recursive through subdirectories. */
  isRecursive: boolean;
  /** Callback invoked to toggle recursive scanning mode. */
  onToggleRecursive: () => void;
  /** Whether the left quick access sidebar is open and visible. */
  isSidebarOpen: boolean;
  /** Callback invoked to toggle the left sidebar visibility. */
  onToggleSidebar: () => void;
  /** Whether the bulk renamer drawer panel is open. */
  isRenamerOpen: boolean;
  /** Callback invoked to toggle the bulk renamer drawer panel. */
  onToggleRenamer: () => void;
  /** Position of the renamer drawer (left or right). */
  renamerPosition: DrawerPosition;
  /** Callback invoked to toggle the renamer drawer dock position. */
  onToggleRenamerPosition: () => void;
  /** Whether folder items are displayed before file items. */
  foldersFirst: boolean;
  /** Callback invoked to toggle folders-first sorting priority. */
  onToggleFoldersFirst: () => void;
  /** Number of currently selected files or folders. */
  selectedCount: number;
  /** Total count of files in the current folder. */
  totalCount: number;
  /** Whether all files are selected. */
  allSelected: boolean;
  /** Callback to toggle select all. */
  onToggleSelectAll: () => void;
  /** Callback to trigger universal laptop search modal. */
  onOpenUniversalSearch: () => void;
  /** Callback to trigger new folder creation. */
  onNewFolder?: () => void;
  /** Current sort field. */
  sortField?: SortField;
  /** Callback to change sort field. */
  onSortChange?: (field: SortField) => void;
  /** Callback to open preferences and settings modal. */
  onOpenSettings?: () => void;
  /** Callback to spawn a new Folderly window. */
  onNewWindow?: () => void;
}

/** Represents a single clickable breadcrumb segment. */
interface PathSegment {
  name: string;
  fullPath: string;
}

/** Parses a filesystem path into breadcrumb segments. */
function parsePathSegments(path: string | null): PathSegment[] {
  if (!path) return [];

  if (path === "recents") {
    return [{ name: "🕒 Recent Files", fullPath: "recents" }];
  }

  if (path === "/" || path === "\\") {
    return [{ name: path, fullPath: path }];
  }

  if (/^[a-zA-Z]:[\\/]?$/i.test(path)) {
    const drive = path.slice(0, 2).toUpperCase();
    return [{ name: drive, fullPath: `${drive}\\` }];
  }

  const rawParts = path.split(/[\\/]/).filter(Boolean);
  if (rawParts.length === 0) return [];

  const segments: PathSegment[] = [];

  if (/^[a-zA-Z]:$/i.test(rawParts[0]) || /^[a-zA-Z]:/i.test(rawParts[0])) {
    const drive = rawParts[0].slice(0, 2).toUpperCase();
    segments.push({ name: drive, fullPath: `${drive}\\` });

    let runningPath = `${drive}\\`;
    for (let i = 1; i < rawParts.length; i++) {
      const part = rawParts[i];
      runningPath = i === 1 ? `${drive}\\${part}` : `${runningPath}\\${part}`;
      segments.push({ name: part, fullPath: runningPath });
    }
  } else {
    let runningPath = "";
    for (const part of rawParts) {
      runningPath = `${runningPath}/${part}`;
      segments.push({ name: part, fullPath: runningPath });
    }
  }

  return segments;
}

/**
 * NavigationBar matching the user's reference layout:
 * - Top bar with Folderly / Folder name and New Window button (Ctrl+N)
 * - Row 1: Sidebar button, history buttons, breadcrumbs address bar, Search Laptop pill
 * - Row 2: Large Folder Title, View mode pills (Cards, Table, Grid), Folders First, Subfolders, + New folder
 * - Row 3: Theme pills (OLED Pink, Light Pink, Material, macOS, Dark), Filter input, Type/Name/Date/Size sort, More options
 * - Row 4: Select all checkbox and helpful usage tips
 */
export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentPath,
  canGoBack,
  canGoForward,
  canGoUp,
  onGoBack,
  onGoForward,
  onGoUp,
  onNavigate,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  isRecursive,
  onToggleRecursive,
  isSidebarOpen,
  onToggleSidebar,
  isRenamerOpen,
  onToggleRenamer,
  foldersFirst,
  onToggleFoldersFirst,
  selectedCount,
  totalCount,
  allSelected,
  onToggleSelectAll,
  onOpenUniversalSearch,
  onNewFolder,
  sortField = "name",
  onSortChange,
  onOpenSettings,
  onNewWindow,
}) => {
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [editPathValue, setEditPathValue] = useState("");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef(false);

  // Extract folder name for large title
  const currentFolderName =
    currentPath === "recents"
      ? "Recent Files"
      : currentPath
      ? currentPath.split(/[\\/]/).filter(Boolean).pop() || "Root"
      : "Downloads";

  const segments = useMemo(() => parsePathSegments(currentPath), [currentPath]);

  useEffect(() => {
    if (!isEditingPath) {
      setEditPathValue(currentPath || "");
    }
  }, [currentPath, isEditingPath]);

  useEffect(() => {
    if (isEditingPath && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingPath]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };
    if (isSortMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSortMenuOpen]);

  const handleStartEditing = () => {
    isCancelledRef.current = false;
    setEditPathValue(currentPath || "");
    setIsEditingPath(true);
  };

  const handleSubmitPath = () => {
    const trimmed = editPathValue.trim();
    setIsEditingPath(false);
    if (trimmed && trimmed !== currentPath) {
      onNavigate(trimmed);
    }
  };

  const handlePathKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitPath();
    } else if (e.key === "Escape") {
      e.preventDefault();
      isCancelledRef.current = true;
      setIsEditingPath(false);
      setEditPathValue(currentPath || "");
    }
  };

  return (
    <header className="flex flex-col select-none shrink-0 border-b border-neutral-800/40">
      {/* ── Top Window Titlebar Row: Name + [+ New Window (Ctrl+N)] ── */}
      <div className="flex items-center justify-between px-4 py-2 text-xs border-b border-neutral-800/30">
        <div className="flex items-center gap-2">
          <span className="text-[#ff2d87]">📁</span>
          <span className="font-semibold text-primary-color">Folderly</span>
          <span className="text-muted-color">/</span>
          <span className="text-muted-color">{currentFolderName}</span>
        </div>

        {/* Multi-Window Spawn Control (replaces duplicate minimize/maximize/close icons) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNewWindow}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-neutral-800/30 hover:border-[#ff2d87]/50 hover:text-[#ff2d87] text-primary-color text-xs font-semibold transition-all shadow-sm group"
            title="Open a new Folderly window (Ctrl+N)"
          >
            <span className="text-[#ff2d87] font-bold group-hover:scale-110 transition-transform">+</span>
            <span>New Window</span>
            <kbd className="text-[10px] bg-neutral-800/50 px-1.5 py-0.5 rounded text-muted-color">
              Ctrl+N
            </kbd>
          </button>
        </div>
      </div>

      {/* ── Row 1: Sidebar Toggle, Navigation Arrows, Breadcrumbs, Search Laptop ── */}
      <div className="flex items-center justify-between gap-3 px-6 py-3">
        {/* Left: Sidebar + Arrows + Breadcrumbs */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Sidebar Toggle Button */}
          <button
            onClick={onToggleSidebar}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isSidebarOpen
                ? "bg-card text-primary-color border border-neutral-800/40"
                : "bg-card text-muted-color hover:text-primary-color"
            }`}
          >
            <span>◧</span>
            <span>Sidebar</span>
          </button>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={onGoBack}
              disabled={!canGoBack}
              className="p-1.5 px-2 rounded-xl bg-card border border-neutral-800/40 text-xs text-primary-color disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800/40"
            >
              ←
            </button>
            <button
              onClick={onGoForward}
              disabled={!canGoForward}
              className="p-1.5 px-2 rounded-xl bg-card border border-neutral-800/40 text-xs text-primary-color disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800/40"
            >
              →
            </button>
            <button
              onClick={onGoUp}
              disabled={!canGoUp}
              className="p-1.5 px-2 rounded-xl bg-card border border-neutral-800/40 text-xs text-primary-color disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800/40"
            >
              ↑
            </button>
          </div>

          {/* Breadcrumbs Address Bar with Pencil */}
          <div className="flex-1 min-w-0 max-w-2xl">
            {isEditingPath ? (
              <input
                ref={inputRef}
                type="text"
                value={editPathValue}
                onChange={(e) => setEditPathValue(e.target.value)}
                onKeyDown={handlePathKeyDown}
                onBlur={() => {
                  if (!isCancelledRef.current) handleSubmitPath();
                }}
                className="w-full bg-input border border-[#ff2d87] rounded-xl px-3 py-1.5 text-xs text-primary-color outline-none shadow-inner"
              />
            ) : (
              <div
                onClick={handleStartEditing}
                className="flex items-center justify-between bg-card border border-neutral-800/30 rounded-xl px-3 py-1.5 min-h-[34px] cursor-text hover:border-neutral-700/60 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs text-primary-color truncate">
                  <span className="text-muted-color">💾</span>
                  {segments.map((seg, idx) => (
                    <React.Fragment key={seg.fullPath}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(seg.fullPath);
                        }}
                        className="hover:text-[#ff2d87] transition-colors truncate font-medium"
                      >
                        {seg.name}
                      </button>
                      {idx < segments.length - 1 && (
                        <span className="text-muted-color text-[10px]">›</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEditing();
                  }}
                  className="text-muted-color hover:text-primary-color text-xs ml-2"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Search Laptop Pill */}
        <button
          onClick={onOpenUniversalSearch}
          className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card border border-neutral-800/40 hover:border-[#ff2d87]/40 text-muted-color hover:text-primary-color text-xs transition-all shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span>🔍</span>
            <span>Search Laptop</span>
          </div>
          <kbd className="text-[10px] bg-neutral-800/40 px-1.5 py-0.5 rounded text-muted-color">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* ── Row 2: Large Title ("Downloads") + Action Controls on Right ── */}
      <div className="flex items-center justify-between px-6 pt-1 pb-3">
        {/* Large Folder Title */}
        <h1 className="text-2xl font-bold text-primary-color tracking-tight">
          {currentFolderName}
        </h1>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* View Mode Switcher Pills */}
          <div className="flex items-center bg-card rounded-xl p-1 border border-neutral-800/30">
            <button
              onClick={() => onViewModeChange("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "cards"
                  ? "bg-[#ff2d87] text-white shadow-sm"
                  : "text-muted-color hover:text-primary-color"
              }`}
            >
              <span>🗂️</span>
              <span>Cards</span>
            </button>
            <button
              onClick={() => onViewModeChange("details")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "details"
                  ? "bg-[#ff2d87] text-white shadow-sm"
                  : "text-muted-color hover:text-primary-color"
              }`}
            >
              <span>📋</span>
              <span>Table</span>
            </button>
            <button
              onClick={() => onViewModeChange("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-[#ff2d87] text-white shadow-sm"
                  : "text-muted-color hover:text-primary-color"
              }`}
            >
              <span>▦</span>
              <span>Grid</span>
            </button>
          </div>

          {/* Folders First Toggle Pill */}
          <button
            onClick={onToggleFoldersFirst}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
              foldersFirst
                ? "bg-card text-primary-color border-neutral-800/60"
                : "bg-card text-muted-color border-neutral-800/30 hover:text-primary-color"
            }`}
          >
            <span>📁</span>
            <span>Folders First</span>
          </button>

          {/* Subfolders Toggle Pill */}
          <button
            onClick={onToggleRecursive}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
              isRecursive
                ? "bg-[#ff2d87] text-white border-[#ff2d87]"
                : "bg-card text-muted-color border-neutral-800/30 hover:text-primary-color"
            }`}
          >
            <span>🔄</span>
            <span>Subfolders</span>
          </button>

          {/* + New Folder Hot Pink Button */}
          <button
            onClick={onNewFolder}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff2d87] hover:bg-[#e61b74] text-white font-bold shadow-md shadow-[#ff2d87]/20 transition-all active:scale-[0.98]"
          >
            <span>+</span>
            <span>New folder</span>
          </button>
        </div>
      </div>

      {/* ── Row 3: Theme & Settings Trigger + Live Filter + Sort + Options ── */}
      <div className="flex items-center justify-between px-6 pb-3 text-xs">
        {/* Left: Settings Trigger Button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card border border-neutral-800/30 text-muted-color hover:text-primary-color hover:border-[#ff2d87]/40 text-xs font-semibold transition-all shadow-sm group"
          title="Open Settings to customize theme and account profile"
        >
          <span className="group-hover:rotate-45 transition-transform">⚙️</span>
          <span>Theme & Settings</span>
        </button>

        {/* Right: Filter search, Sort, More Options (Renamer Drawer) */}
        <div className="flex items-center gap-2">
          {/* Filter Search Input */}
          <div className="relative flex items-center w-52">
            <span className="absolute left-3 text-muted-color text-xs pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter files in folder"
              className="w-full bg-card border border-neutral-800/30 rounded-xl pl-8 pr-7 py-1.5 text-xs text-primary-color placeholder-muted-color outline-none focus:border-[#ff2d87] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 text-muted-color hover:text-primary-color text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector Dropdown */}
          <div className="relative" ref={sortMenuRef}>
            <button
              onClick={() => setIsSortMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border text-xs font-semibold transition-all ${
                sortField === "type"
                  ? "border-[#ff2d87] text-[#ff2d87]"
                  : "border-neutral-800/30 text-primary-color hover:border-[#ff2d87]/40"
              }`}
              title="Change sort order (Type, Name, Date, Size)"
            >
              <span>⇅</span>
              <span>
                Sort:{" "}
                {sortField === "type"
                  ? "Type"
                  : sortField === "name"
                  ? "Name"
                  : sortField === "date"
                  ? "Date"
                  : "Size"}
              </span>
              <span className="text-[10px] text-muted-color">▾</span>
            </button>

            {isSortMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-card border border-neutral-800/60 rounded-xl shadow-2xl py-1.5 z-50 text-xs backdrop-blur-md">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-muted-color tracking-wider">
                  Sort Files By
                </div>
                <button
                  onClick={() => {
                    onSortChange?.("type");
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-neutral-800/40 transition-colors ${
                    sortField === "type" ? "text-[#ff2d87] font-bold" : "text-primary-color"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🏷️</span>
                    <span>File Type</span>
                  </span>
                  {sortField === "type" && <span>✓</span>}
                </button>
                <button
                  onClick={() => {
                    onSortChange?.("name");
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-neutral-800/40 transition-colors ${
                    sortField === "name" ? "text-[#ff2d87] font-bold" : "text-primary-color"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🔤</span>
                    <span>Name</span>
                  </span>
                  {sortField === "name" && <span>✓</span>}
                </button>
                <button
                  onClick={() => {
                    onSortChange?.("date");
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-neutral-800/40 transition-colors ${
                    sortField === "date" ? "text-[#ff2d87] font-bold" : "text-primary-color"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>📅</span>
                    <span>Date Modified</span>
                  </span>
                  {sortField === "date" && <span>✓</span>}
                </button>
                <button
                  onClick={() => {
                    onSortChange?.("size");
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-neutral-800/40 transition-colors ${
                    sortField === "size" ? "text-[#ff2d87] font-bold" : "text-primary-color"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>⚖️</span>
                    <span>Size</span>
                  </span>
                  {sortField === "size" && <span>✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Renamer Drawer Trigger (···) */}
          <button
            onClick={onToggleRenamer}
            className={`px-3 py-1.5 rounded-xl border font-bold transition-all ${
              isRenamerOpen
                ? "bg-[#ff2d87] text-white border-[#ff2d87]"
                : "bg-card border-neutral-800/30 text-muted-color hover:text-primary-color"
            }`}
            title="Bulk Renamer Drawer"
          >
            ···
          </button>
        </div>
      </div>

      {/* ── Row 4: Select All Checkbox + Double-Click Tip ── */}
      <div className="flex items-center justify-between px-6 pb-2 text-xs text-muted-color">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="accent-[#ff2d87] w-4 h-4 rounded cursor-pointer"
          />
          <span className="text-muted-color">
            Select all ({totalCount} files)
            {selectedCount > 0 && selectedCount !== totalCount && (
              <span className="text-[#ff2d87] font-semibold ml-1">
                ({selectedCount} selected)
              </span>
            )}
          </span>
        </label>

        <span className="text-[11px] text-muted-color/80 flex items-center gap-1">
          <span>💡</span>
          <span>
            Double-click folder to open • Double-click file to launch • Right-click for more
          </span>
        </span>
      </div>
    </header>
  );
};

export default NavigationBar;
