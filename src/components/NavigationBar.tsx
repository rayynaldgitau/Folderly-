import React, { useState, useEffect, useRef, useMemo } from "react";
import type { ViewMode, DrawerPosition, SortField, TabItem } from "../types";
import { MacFolderIcon } from "./MacIcons";
import { FoldyLogo } from "./FoldyLogo";

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
  /** All currently open tabs. */
  tabs: TabItem[];
  /** ID of the active tab. */
  activeTabId: string;
  /** Callback invoked when switching active tabs. */
  onSelectTab: (tabId: string) => void;
  /** Callback invoked to open a new tab. */
  onNewTab: (initialPath?: string) => void;
  /** Callback invoked to close a tab by id. */
  onCloseTab: (tabId: string) => void;
  /** Callback fired to rearrange tabs by dragging. */
  onReorderTabs?: (fromTabId: string, toTabId: string) => void;
  /** Callback fired when an item is dropped onto a tab destination. */
  onMoveItem?: (sourcePath: string, destDir: string) => void;
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
 * - Top bar with Foldy brand logo and tabs
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
  tabs = [],
  activeTabId,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onReorderTabs,
  onMoveItem,
}) => {
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const tabHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      {/* ── Top Browser / Explorer Tab Bar Strip ── */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-neutral-800/30 bg-sidebar/50 backdrop-blur-sm gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
          {/* Cute Foldy Brand Pill */}
          <div
            className="flex items-center gap-2 px-2.5 py-1 shrink-0 font-bold text-xs select-none group rounded-xl hover:bg-card/40 transition-colors"
            title="Foldy – Visual File Organizer"
          >
            <FoldyLogo size={22} interactive={true} className="group-hover:rotate-6 transition-transform" />
            <span className="hidden sm:inline font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-[13px]">
              Foldy
            </span>
          </div>

          {/* Active & Inactive Tabs */}
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isOver = dragOverTabId === tab.id;
            const isDragging = draggedTabId === tab.id;

            return (
              <div
                key={tab.id}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/foldy-tab-id", tab.id);
                  e.dataTransfer.setData("text/plain", tab.path || tab.title);
                  e.dataTransfer.effectAllowed = "move";
                  setDraggedTabId(tab.id);
                }}
                onDragEnd={() => {
                  setDraggedTabId(null);
                  setDragOverTabId(null);
                }}
                onClick={() => onSelectTab(tab.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverTabId !== tab.id) {
                    setDragOverTabId(tab.id);
                  }
                }}
                onDragEnter={() => {
                  setDragOverTabId(tab.id);
                  // Hovering over an inactive tab for 350ms automatically activates it so user sees the folder
                  if (!tabHoverTimerRef.current && tab.id !== activeTabId) {
                    tabHoverTimerRef.current = setTimeout(() => {
                      onSelectTab(tab.id);
                      tabHoverTimerRef.current = null;
                    }, 350);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverTabId === tab.id) {
                      setDragOverTabId(null);
                    }
                  }
                  if (tabHoverTimerRef.current) {
                    clearTimeout(tabHoverTimerRef.current);
                    tabHoverTimerRef.current = null;
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverTabId(null);
                  setDraggedTabId(null);
                  if (tabHoverTimerRef.current) {
                    clearTimeout(tabHoverTimerRef.current);
                    tabHoverTimerRef.current = null;
                  }

                  const droppedTabId = e.dataTransfer.getData("application/foldy-tab-id");
                  if (droppedTabId && droppedTabId !== tab.id && onReorderTabs) {
                    onReorderTabs(droppedTabId, tab.id);
                    return;
                  }

                  const src =
                    e.dataTransfer.getData("application/foldy-path") ||
                    e.dataTransfer.getData("application/folderly-path") ||
                    e.dataTransfer.getData("text/plain");
                  if (src && tab.path && tab.path !== "recents" && onMoveItem) {
                    onMoveItem(src, tab.path);
                  }
                }}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs max-w-[200px] min-w-[110px] shrink-0 cursor-grab active:cursor-grabbing transition-all select-none border ${
                  isDragging ? "opacity-40" : ""
                } ${
                  isOver
                    ? "ring-2 ring-[#ff2d87] border-[#ff2d87] bg-[#ff2d87]/20 text-[#ff2d87] font-bold scale-[1.03] shadow-md"
                    : isActive
                    ? "bg-card border-neutral-700/60 text-primary-color font-semibold shadow-sm ring-1 ring-[#ff2d87]/40"
                    : "bg-transparent border-transparent text-muted-color hover:text-primary-color hover:bg-card/40"
                }`}
                title={
                  tab.path
                    ? `${tab.path}\nDrag to reorder tabs, or drop items here to move into this folder`
                    : tab.title
                }
              >
                <span className="shrink-0 flex items-center pointer-events-none">
                  {tab.path === "recents" ? (
                    <span>🕒</span>
                  ) : !tab.path ? (
                    <span>🏠</span>
                  ) : (
                    <MacFolderIcon size={14} />
                  )}
                </span>
                <span className="truncate flex-1 text-[11px] font-medium pointer-events-none">
                  {tab.title}
                </span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-muted-color hover:text-white hover:bg-[#ff2d87] transition-all opacity-0 group-hover:opacity-100"
                    title="Close Tab (Ctrl+W)"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          {/* + New Tab Button (also supports dropping a folder/file to open it in a new tab) */}
          <button
            onClick={() => onNewTab()}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const src =
                e.dataTransfer.getData("application/foldy-path") ||
                e.dataTransfer.getData("application/folderly-path") ||
                e.dataTransfer.getData("text/plain");
              if (src) {
                onNewTab(src);
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-card/60 hover:bg-card border border-neutral-800/40 hover:border-[#ff2d87]/40 text-muted-color hover:text-[#ff2d87] text-xs font-semibold shrink-0 transition-all shadow-sm group"
            title="Open a new tab (Ctrl+T) or drag a folder/file here"
          >
            <span className="font-bold text-sm leading-none group-hover:scale-110 transition-transform">+</span>
          </button>
        </div>

        {/* Right side helper shortcut indicator */}
        <div className="hidden md:flex items-center gap-2 text-muted-color text-[11px] shrink-0 pr-1">
          <kbd className="bg-neutral-800/40 border border-neutral-800/60 px-1.5 py-0.5 rounded text-[10px] text-neutral-400">
            Ctrl+T
          </kbd>
          <span className="text-[10px]">New Tab</span>
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
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const src =
                            e.dataTransfer.getData("application/foldy-path") ||
                            e.dataTransfer.getData("application/folderly-path") ||
                            e.dataTransfer.getData("text/plain");
                          if (src && seg.fullPath !== "recents" && onMoveItem) {
                            onMoveItem(src, seg.fullPath);
                          }
                        }}
                        className="hover:text-[#ff2d87] transition-colors truncate font-medium hover:underline"
                        title={`Click to navigate to ${seg.name}, or drop items here to move`}
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
