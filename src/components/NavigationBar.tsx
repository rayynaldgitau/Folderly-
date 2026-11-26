import React, { useState, useEffect, useRef, useMemo } from "react";
import type { ViewMode, DrawerPosition, SortField, TabItem } from "../types";
import { MacFolderIcon } from "./MacIcons";
import { FoldyLogo } from "./FoldyLogo";
import {
  Button,
  Chip,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconClose,
  IconFolder,
  IconFolderPlus,
  IconGrid,
  IconList,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconSidebar,
  IconSliders,
} from "./ui";

export interface NavigationBarProps {
  currentPath: string | null;
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isRecursive: boolean;
  onToggleRecursive: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isRenamerOpen: boolean;
  onToggleRenamer: () => void;
  renamerPosition: DrawerPosition;
  onToggleRenamerPosition: () => void;
  foldersFirst: boolean;
  onToggleFoldersFirst: () => void;
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  onOpenUniversalSearch: () => void;
  onNewFolder?: () => void;
  sortField?: SortField;
  onSortChange?: (field: SortField) => void;
  onOpenSettings?: () => void;
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onNewTab: (initialPath?: string) => void;
  onCloseTab: (tabId: string) => void;
  onReorderTabs?: (fromTabId: string, toTabId: string) => void;
  onMoveItem?: (sourcePath: string, destDir: string) => void;
}

interface PathSegment {
  name: string;
  fullPath: string;
}

function parsePathSegments(path: string | null): PathSegment[] {
  if (!path) return [];
  if (path === "recents") {
    return [{ name: "Recent Files", fullPath: "recents" }];
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
 * Material 3 Top App Bar & Explorer Chrome:
 * - Tab strip with drag-and-drop reordering and drop-to-move
 * - History controls, editable breadcrumb bar, and universal search
 * - Folder title, segmented view switcher, filter/sort controls, and Bulk Renamer trigger
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSortMenuOpen(false);
    };
    if (isSortMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
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

  const sortLabels: Record<SortField, string> = {
    type: "File Type",
    name: "Name",
    date: "Date Modified",
    size: "Size",
  };

  return (
    <header className="flex flex-col select-none shrink-0 bg-surface">
      {/* Top Tab Strip */}
      <div
        role="tablist"
        aria-label="Open folder tabs"
        className="flex items-center justify-between px-3 py-1.5 text-xs bg-surface-container-low gap-2"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
          <div
            className="flex items-center gap-2 px-2.5 py-1 shrink-0 font-semibold text-xs rounded-m3-md"
            title="Foldy – Visual File Organizer"
          >
            <FoldyLogo size={20} interactive={true} />
            <span className="hidden sm:inline font-bold tracking-tight text-on-surface text-[13px]">
              Foldy
            </span>
          </div>

          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isOver = dragOverTabId === tab.id;
            const isDragging = draggedTabId === tab.id;

            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                draggable={true}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectTab(tab.id);
                  }
                }}
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
                  if (dragOverTabId !== tab.id) setDragOverTabId(tab.id);
                }}
                onDragEnter={() => {
                  setDragOverTabId(tab.id);
                  if (!tabHoverTimerRef.current && tab.id !== activeTabId) {
                    tabHoverTimerRef.current = setTimeout(() => {
                      onSelectTab(tab.id);
                      tabHoverTimerRef.current = null;
                    }, 350);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverTabId === tab.id) setDragOverTabId(null);
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
                className={`group flex items-center gap-2 px-3 min-h-[36px] rounded-m3-md text-xs max-w-[200px] min-w-[110px] shrink-0 cursor-grab active:cursor-grabbing m3-pressable ${
                  isDragging ? "opacity-40" : ""
                } ${
                  isOver
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : isActive
                    ? "bg-surface-container-high text-on-surface font-semibold"
                    : "bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
                title={tab.path || tab.title}
              >
                <span className="shrink-0 flex items-center pointer-events-none">
                  {tab.path === "recents" ? (
                    <IconClock size={14} />
                  ) : !tab.path ? (
                    <IconFolder size={14} />
                  ) : (
                    <MacFolderIcon size={14} />
                  )}
                </span>
                <span className="truncate flex-1 text-xs pointer-events-none">
                  {tab.title}
                </span>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Close ${tab.title} tab`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="w-6 h-6 rounded-m3-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Close Tab (Ctrl+W)"
                  >
                    <IconClose size={12} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            aria-label="Open new tab"
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
              if (src) onNewTab(src);
            }}
            className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-m3-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary shrink-0 m3-pressable"
            title="New tab (Ctrl+T)"
          >
            <IconPlus size={16} />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-on-surface-variant text-[11px] shrink-0 pr-1">
          <kbd className="bg-surface-container px-1.5 py-0.5 rounded-m3-xs text-[10px] font-mono">
            Ctrl+T
          </kbd>
          <span>New Tab</span>
        </div>
      </div>

      {/* Row 1: Navigation, Breadcrumbs & Universal Search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-6 py-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Button
            variant={isSidebarOpen ? "tonal" : "outlined"}
            size="sm"
            onClick={onToggleSidebar}
            aria-pressed={isSidebarOpen}
            aria-label="Toggle navigation sidebar"
            leadingIcon={<IconSidebar size={16} />}
          >
            <span className="hidden sm:inline">Sidebar</span>
          </Button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Go back"
              onClick={onGoBack}
              disabled={!canGoBack}
              className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-m3-full bg-surface-container text-on-surface disabled:opacity-35 disabled:cursor-not-allowed hover:bg-surface-container-high m3-pressable"
            >
              <IconArrowLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Go forward"
              onClick={onGoForward}
              disabled={!canGoForward}
              className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-m3-full bg-surface-container text-on-surface disabled:opacity-35 disabled:cursor-not-allowed hover:bg-surface-container-high m3-pressable"
            >
              <IconArrowRight size={16} />
            </button>
            <button
              type="button"
              aria-label="Go to parent folder"
              onClick={onGoUp}
              disabled={!canGoUp}
              className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-m3-full bg-surface-container text-on-surface disabled:opacity-35 disabled:cursor-not-allowed hover:bg-surface-container-high m3-pressable"
            >
              <IconArrowUp size={16} />
            </button>
          </div>

          <div className="flex-1 min-w-0 max-w-2xl">
            {isEditingPath ? (
              <input
                ref={inputRef}
                type="text"
                aria-label="Folder path"
                value={editPathValue}
                onChange={(e) => setEditPathValue(e.target.value)}
                onKeyDown={handlePathKeyDown}
                onBlur={() => {
                  if (!isCancelledRef.current) handleSubmitPath();
                }}
                className="w-full min-h-[40px] bg-surface-container-lowest border border-primary rounded-m3-sm px-3.5 text-xs text-on-surface outline-none"
              />
            ) : (
              <nav
                aria-label="Breadcrumb"
                onClick={handleStartEditing}
                className="flex items-center justify-between bg-surface-container rounded-m3-full px-3.5 min-h-[40px] cursor-text hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-1 text-xs text-on-surface truncate">
                  {segments.map((seg, idx) => (
                    <React.Fragment key={seg.fullPath}>
                      <button
                        type="button"
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
                        className="hover:text-primary transition-colors truncate font-medium px-1 py-0.5 rounded-m3-xs hover:bg-surface-container-high"
                        title={`Navigate to ${seg.name}`}
                      >
                        {seg.name}
                      </button>
                      {idx < segments.length - 1 && (
                        <IconChevronRight
                          size={14}
                          className="text-on-surface-variant shrink-0"
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </nav>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenUniversalSearch}
          aria-label="Search across laptop (Ctrl+K)"
          className="flex items-center gap-3 px-4 min-h-[40px] rounded-m3-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface text-xs font-medium m3-pressable"
        >
          <span className="flex items-center gap-2">
            <IconSearch size={15} className="text-primary" />
            <span className="hidden sm:inline">Search Laptop</span>
          </span>
          <kbd className="hidden md:inline text-[10px] bg-surface-container px-1.5 py-0.5 rounded-m3-xs font-mono">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Row 2: Page Title & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 pt-1 pb-2.5">
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight truncate">
          {currentFolderName}
        </h1>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* M3 Segmented View Switcher */}
          <div
            role="group"
            aria-label="View mode"
            className="inline-flex items-center bg-surface-container rounded-m3-full p-1"
          >
            {(
              [
                { mode: "cards", label: "Cards", icon: <IconFolder size={14} /> },
                { mode: "details", label: "Table", icon: <IconList size={14} /> },
                { mode: "grid", label: "Grid", icon: <IconGrid size={14} /> },
              ] as const
            ).map(({ mode, label, icon }) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onViewModeChange(mode)}
                  className={`flex items-center gap-1.5 px-3 min-h-[32px] rounded-m3-full font-semibold m3-pressable ${
                    active
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <Chip
            selected={foldersFirst}
            onClick={onToggleFoldersFirst}
            leadingIcon={<IconFolder size={14} />}
          >
            Folders First
          </Chip>

          <Chip
            selected={isRecursive}
            onClick={onToggleRecursive}
            leadingIcon={<IconRefresh size={14} />}
          >
            Subfolders
          </Chip>

          {onNewFolder && (
            <Button
              variant="filled"
              size="sm"
              onClick={onNewFolder}
              leadingIcon={<IconFolderPlus size={16} />}
            >
              New folder
            </Button>
          )}
        </div>
      </div>

      {/* Row 3: Settings, Live Filter, Sort & Bulk Renamer */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 pb-2.5 text-xs">
        <Button
          variant="tonal"
          size="sm"
          onClick={onOpenSettings}
          leadingIcon={<IconSettings size={15} />}
        >
          Theme & Settings
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex items-center w-48 sm:w-56">
            <IconSearch
              size={14}
              className="absolute left-3 text-on-surface-variant pointer-events-none"
            />
            <input
              type="text"
              aria-label="Filter files in current folder"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter files in folder"
              className="w-full min-h-[38px] bg-surface-container-lowest border border-outline-variant rounded-m3-full pl-9 pr-8 text-xs text-on-surface placeholder:text-on-surface-variant/70 outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear folder filter"
                onClick={() => onSearchChange("")}
                className="absolute right-2 w-6 h-6 flex items-center justify-center rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              >
                <IconClose size={13} />
              </button>
            )}
          </div>

          <div className="relative" ref={sortMenuRef}>
            <Button
              variant="outlined"
              size="sm"
              aria-haspopup="menu"
              aria-expanded={isSortMenuOpen}
              onClick={() => setIsSortMenuOpen((prev) => !prev)}
            >
              Sort: {sortLabels[sortField]}
            </Button>

            {isSortMenuOpen && (
              <div
                role="menu"
                aria-label="Sort files by"
                className="absolute right-0 mt-1.5 w-48 bg-surface-container-high rounded-m3-md shadow-m3-2 py-1.5 px-1.5 z-50 text-xs animate-m3-popover"
                style={{ "--transform-origin": "top right" } as React.CSSProperties}
              >
                <div className="px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
                  Sort Files By
                </div>
                {(["type", "name", "date", "size"] as SortField[]).map((field) => (
                  <button
                    key={field}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sortField === field}
                    onClick={() => {
                      onSortChange?.(field);
                      setIsSortMenuOpen(false);
                    }}
                    className={`w-full min-h-[36px] flex items-center justify-between px-2.5 py-1.5 rounded-m3-sm text-left m3-pressable ${
                      sortField === field
                        ? "bg-secondary-container text-on-secondary-container font-semibold"
                        : "text-on-surface hover:bg-surface-container-highest"
                    }`}
                  >
                    <span>{sortLabels[field]}</span>
                    {sortField === field && <IconCheck size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            variant={isRenamerOpen ? "filled" : "tonal"}
            size="sm"
            aria-pressed={isRenamerOpen}
            onClick={onToggleRenamer}
            leadingIcon={<IconSliders size={15} />}
          >
            Bulk Renamer
          </Button>
        </div>
      </div>

      {/* Row 4: Select All + Keyboard/Pointer Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 pb-2.5 text-xs text-on-surface-variant">
        <label className="flex items-center gap-2 cursor-pointer select-none min-h-[32px]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded cursor-pointer accent-primary"
          />
          <span>
            Select all ({totalCount} files)
            {selectedCount > 0 && selectedCount !== totalCount && (
              <span className="text-primary font-semibold ml-1.5">
                ({selectedCount} selected)
              </span>
            )}
          </span>
        </label>

        <span className="text-[11px] text-on-surface-variant hidden lg:inline">
          Double-click to open • Space or P for Quick Look • Right-click for actions
        </span>
      </div>
    </header>
  );
};

export default NavigationBar;
