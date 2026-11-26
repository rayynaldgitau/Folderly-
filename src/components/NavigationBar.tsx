import React, { useState, useEffect, useRef, useMemo } from "react";
import type { ViewMode, DrawerPosition, SortDirection, SortField, TabItem } from "../types";
import { SORT_LABELS, SORT_OPTIONS } from "../utils/sort";
import { getViewOptions, VIEW_LABELS } from "../utils/view";
import { MacFolderIcon } from "./MacIcons";
import { FoldyLogo } from "./FoldyLogo";
import {
  Button,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconClose,
  IconFolder,
  IconFolderMove,
  IconFolderPlus,
  IconGrid,
  IconHardDrive,
  IconMoreVert,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSidebar,
  IconSliders,
  IconTrash,
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
  nodeViewEnabled?: boolean;
  showDetailsPane?: boolean;
  onToggleDetailsPane?: () => void;
  showPreviewPane?: boolean;
  onTogglePreviewPane?: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isRenamerOpen: boolean;
  onToggleRenamer: () => void;
  renamerPosition: DrawerPosition;
  onToggleRenamerPosition: () => void;
  selectedCount: number;
  folderCount: number;
  fileCount: number;
  onClearSelection: () => void;
  onRenameSelected: () => void;
  onDeleteSelected: () => void;
  onMoveSelected: () => void;
  onNewFolder?: () => void;
  onClearRecents?: () => void;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: SortField) => void;
  onSortDirectionChange?: (direction: SortDirection) => void;
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
  isDrive?: boolean;
}

function parsePathSegments(path: string | null): PathSegment[] {
  if (!path) return [];
  if (path === "recents") {
    return [{ name: "Recent Files", fullPath: "recents" }];
  }
  if (path === "/" || path === "\\") {
    return [{ name: path, fullPath: path, isDrive: true }];
  }
  if (/^[a-zA-Z]:[\\/]?$/i.test(path)) {
    const drive = path.slice(0, 2).toUpperCase();
    return [{ name: drive, fullPath: `${drive}\\`, isDrive: true }];
  }

  const rawParts = path.split(/[\\/]/).filter(Boolean);
  if (rawParts.length === 0) return [];

  const segments: PathSegment[] = [];
  if (/^[a-zA-Z]:$/i.test(rawParts[0]) || /^[a-zA-Z]:/i.test(rawParts[0])) {
    const drive = rawParts[0].slice(0, 2).toUpperCase();
    segments.push({ name: drive, fullPath: `${drive}\\`, isDrive: true });
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

function formatSubtitleCount(folderCount: number, fileCount: number): string {
  if (folderCount === 0 && fileCount === 0) return "Empty folder";
  const parts: string[] = [];
  if (folderCount > 0) {
    parts.push(`${folderCount} ${folderCount === 1 ? "folder" : "folders"}`);
  }
  if (fileCount > 0) {
    parts.push(`${fileCount} ${fileCount === 1 ? "file" : "files"}`);
  }
  return parts.join(", ");
}

/**
 * Calm Material 3 Top App Bar, Page Header, and Slim Controls Row.
 * Replaces top bar with a contextual selection bar when items are selected.
 */
export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentPath,
  canGoBack,
  canGoForward,
  canGoUp,
  onGoBack,
  onGoForward,
  onGoUp,
  onRefresh,
  onNavigate,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  nodeViewEnabled = false,
  showDetailsPane = false,
  onToggleDetailsPane,
  showPreviewPane = false,
  onTogglePreviewPane,
  isSidebarOpen,
  onToggleSidebar,
  isRenamerOpen,
  onToggleRenamer,
  renamerPosition,
  onToggleRenamerPosition,
  selectedCount,
  folderCount,
  fileCount,
  onClearSelection,
  onRenameSelected,
  onDeleteSelected,
  onMoveSelected,
  onNewFolder,
  onClearRecents,
  sortField = "name",
  sortDirection = "asc",
  onSortChange,
  onSortDirectionChange,
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
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef(false);

  const currentFolderName =
    currentPath === "recents"
      ? "Recent Files"
      : currentPath
      ? currentPath.split(/[\\/]/).filter(Boolean).pop() || "Root"
      : "Downloads";

  const segments = useMemo(() => parsePathSegments(currentPath), [currentPath]);

  // Truncate middle breadcrumb segments with an ellipsis when path is deep
  const displaySegments = useMemo(() => {
    if (segments.length <= 4) {
      return segments.map((seg) => ({ ...seg, isEllipsis: false }));
    }
    return [
      { ...segments[0], isEllipsis: false },
      { name: "…", fullPath: segments[segments.length - 3].fullPath, isEllipsis: true },
      { ...segments[segments.length - 2], isEllipsis: false },
      { ...segments[segments.length - 1], isEllipsis: false },
    ];
  }, [segments]);

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
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setIsViewMenuOpen(false);
      }
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setIsOverflowOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSortMenuOpen(false);
        setIsViewMenuOpen(false);
        setIsOverflowOpen(false);
      }
    };
    if (isSortMenuOpen || isViewMenuOpen || isOverflowOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSortMenuOpen, isViewMenuOpen, isOverflowOpen]);

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

      {/* Row 1: Top App Bar OR Contextual Selection Bar */}
      {selectedCount > 0 ? (
        <div
          role="toolbar"
          aria-label="Selection actions"
          className="flex items-center justify-between gap-3 mx-4 sm:mx-6 my-2 px-3 min-h-[44px] rounded-m3-full bg-primary-container text-on-primary-container animate-m3-selection-bar"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearSelection}
              aria-label="Clear selection"
              className="inline-flex items-center justify-center w-8 h-8 rounded-m3-full hover:bg-on-primary-container/10 m3-pressable"
            >
              <IconClose size={18} />
            </button>
            <span className="text-xs font-semibold">
              {selectedCount} selected
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRenameSelected}
              className="inline-flex items-center gap-1.5 px-3 min-h-[34px] rounded-m3-full text-xs font-medium hover:bg-on-primary-container/10 m3-pressable"
            >
              <IconPencil size={15} />
              <span>Rename</span>
            </button>
            <button
              type="button"
              onClick={onMoveSelected}
              className="inline-flex items-center gap-1.5 px-3 min-h-[34px] rounded-m3-full text-xs font-medium hover:bg-on-primary-container/10 m3-pressable"
            >
              <IconFolderMove size={15} />
              <span>Move</span>
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="inline-flex items-center gap-1.5 px-3 min-h-[34px] rounded-m3-full text-xs font-medium text-error hover:bg-error-container/60 m3-pressable"
            >
              <IconTrash size={15} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-pressed={isSidebarOpen}
              aria-label="Toggle navigation sidebar"
              title="Toggle sidebar"
              className="inline-flex items-center justify-center w-9 h-9 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high m3-pressable shrink-0"
            >
              <IconSidebar size={18} />
            </button>

            <button
              type="button"
              aria-label="Go back"
              onClick={onGoBack}
              disabled={!canGoBack}
              className="inline-flex items-center justify-center w-9 h-9 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-35 disabled:pointer-events-none m3-pressable shrink-0"
            >
              <IconArrowLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Go forward"
              onClick={onGoForward}
              disabled={!canGoForward}
              className="inline-flex items-center justify-center w-9 h-9 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-35 disabled:pointer-events-none m3-pressable shrink-0"
            >
              <IconArrowRight size={18} />
            </button>
            <button
              type="button"
              aria-label="Go to parent folder"
              onClick={onGoUp}
              disabled={!canGoUp}
              className="inline-flex items-center justify-center w-9 h-9 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-35 disabled:pointer-events-none m3-pressable shrink-0"
            >
              <IconArrowUp size={18} />
            </button>

            <div className="flex-1 min-w-0 max-w-2xl ml-1">
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
                  className="w-full min-h-[38px] bg-surface-container-high rounded-m3-full px-3.5 text-xs text-on-surface outline-none"
                />
              ) : (
                <nav
                  aria-label="Breadcrumb"
                  onClick={handleStartEditing}
                  className="flex items-center bg-surface-container rounded-m3-full px-3 min-h-[38px] cursor-text hover:bg-surface-container-high transition-colors min-w-0"
                  title={currentPath || undefined}
                >
                  <div className="flex items-center gap-0.5 text-xs text-on-surface min-w-0 overflow-hidden">
                    {displaySegments.map((seg, idx) => (
                      <React.Fragment key={`${seg.fullPath}-${idx}`}>
                        {seg.isEllipsis ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate(seg.fullPath);
                            }}
                            title={currentPath || "Show parent"}
                            aria-label="Navigate to parent segment"
                            className="px-1.5 py-0.5 rounded-m3-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest shrink-0"
                          >
                            …
                          </button>
                        ) : (
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
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors truncate font-medium px-1.5 py-1 rounded-m3-xs hover:bg-surface-container-highest max-w-[160px]"
                            title={`Navigate to ${seg.name}`}
                            aria-label={seg.isDrive ? `Drive ${seg.name}` : seg.name}
                          >
                            {seg.isDrive ? (
                              <IconHardDrive size={15} className="text-on-surface-variant shrink-0" />
                            ) : (
                              <span className="truncate">{seg.name}</span>
                            )}
                          </button>
                        )}
                        {idx < displaySegments.length - 1 && (
                          <IconChevronRight
                            size={14}
                            className="text-on-surface-variant/60 shrink-0"
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </nav>
              )}
            </div>
          </div>

          {/* Folder Search Field */}
          <div className="relative flex items-center w-48 sm:w-64 shrink-0">
            <IconSearch
              size={15}
              className="absolute left-3.5 text-on-surface-variant pointer-events-none"
            />
            <input
              type="text"
              aria-label={`Search in ${currentFolderName}`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Search in ${currentFolderName}`}
              className="w-full min-h-[38px] bg-surface-container hover:bg-surface-container-high focus:bg-surface-container-high rounded-m3-full pl-9 pr-9 text-xs text-on-surface placeholder:text-on-surface-variant/70 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
                className="absolute right-2 w-6 h-6 flex items-center justify-center rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest m3-pressable"
              >
                <IconClose size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Row 2: Page Header */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 pt-2 pb-1">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-on-surface tracking-tight truncate">
            {currentFolderName}
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {formatSubtitleCount(folderCount, fileCount)}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onClearRecents && (
            <Button
              variant="tonal"
              size="sm"
              onClick={onClearRecents}
              leadingIcon={<IconTrash size={15} />}
            >
              Clear recents
            </Button>
          )}
          {onNewFolder && (
            <Button
              variant="tonal"
              size="sm"
              onClick={onNewFolder}
              leadingIcon={<IconFolderPlus size={16} />}
            >
              New folder
            </Button>
          )}

          <div className="relative" ref={overflowMenuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isOverflowOpen}
              aria-label="More folder actions"
              onClick={() => setIsOverflowOpen((prev) => !prev)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high m3-pressable"
            >
              <IconMoreVert size={18} />
            </button>

            {isOverflowOpen && (
              <div
                role="menu"
                aria-label="Folder actions"
                className="absolute right-0 mt-1.5 w-52 bg-surface-container-high rounded-m3-md shadow-m3-2 py-1.5 px-1.5 z-50 text-xs animate-m3-popover"
                style={{ "--transform-origin": "top right" } as React.CSSProperties}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleRenamer();
                    setIsOverflowOpen(false);
                  }}
                  className={`w-full min-h-[36px] flex items-center justify-between px-2.5 py-1.5 rounded-m3-sm text-left m3-pressable ${
                    isRenamerOpen
                      ? "bg-secondary-container text-on-secondary-container font-semibold"
                      : "text-on-surface hover:bg-surface-container-highest"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconSliders size={15} />
                    <span>Bulk Renamer</span>
                  </span>
                  {isRenamerOpen && <IconCheck size={14} />}
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onRefresh();
                    setIsOverflowOpen(false);
                  }}
                  className="w-full min-h-[36px] flex items-center gap-2 px-2.5 py-1.5 rounded-m3-sm text-left text-on-surface hover:bg-surface-container-highest m3-pressable"
                >
                  <IconRefresh size={15} />
                  <span>Refresh folder</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleRenamerPosition();
                    setIsOverflowOpen(false);
                  }}
                  className="w-full min-h-[36px] flex items-center justify-between px-2.5 py-1.5 rounded-m3-sm text-left text-on-surface hover:bg-surface-container-highest m3-pressable"
                >
                  <span>Renamer side</span>
                  <span className="text-[11px] text-on-surface-variant capitalize">
                    {renamerPosition}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Slim Controls Row */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2 text-xs">
        <div className="relative" ref={sortMenuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isSortMenuOpen}
            onClick={() => setIsSortMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 min-h-[32px] rounded-m3-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-medium m3-pressable"
          >
            {sortDirection === "asc" ? (
              <IconArrowUp size={13} />
            ) : (
              <IconArrowDown size={13} />
            )}
            <span>Sort: {SORT_LABELS[sortField]}</span>
            <IconChevronDown size={14} />
          </button>

          {isSortMenuOpen && (
            <div
              role="menu"
              aria-label="Sort files by"
              className="absolute left-0 mt-1.5 w-52 bg-surface-container-high rounded-m3-md shadow-m3-2 p-1.5 z-50 text-xs animate-m3-popover"
              style={{ "--transform-origin": "top left" } as React.CSSProperties}
            >
              <div className="flex flex-col gap-0.5">
                {SORT_OPTIONS.map(({ field, label }) => {
                  const selected = sortField === field;
                  return (
                    <button
                      key={field}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        onSortChange?.(field);
                        setIsSortMenuOpen(false);
                      }}
                      className={`w-full min-h-[34px] flex items-center justify-between px-2.5 py-1.5 rounded-m3-sm text-left m3-pressable ${
                        selected
                          ? "bg-secondary-container text-on-secondary-container font-semibold"
                          : "text-on-surface hover:bg-surface-container-highest"
                      }`}
                    >
                      <span>{label}</span>
                      {selected && <IconCheck size={14} />}
                    </button>
                  );
                })}
              </div>

              <div
                role="group"
                aria-label="Sort direction"
                className="mt-1.5 p-1 rounded-m3-sm bg-surface-container flex flex-col gap-0.5"
              >
                {(
                  [
                    { dir: "asc", label: "Ascending", icon: <IconArrowUp size={13} /> },
                    { dir: "desc", label: "Descending", icon: <IconArrowDown size={13} /> },
                  ] as const
                ).map(({ dir, label, icon }) => {
                  const selected = sortDirection === dir;
                  return (
                    <button
                      key={dir}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        onSortDirectionChange?.(dir);
                        setIsSortMenuOpen(false);
                      }}
                      className={`w-full min-h-[32px] flex items-center justify-between px-2 py-1 rounded-m3-xs text-left m3-pressable ${
                        selected
                          ? "bg-secondary-container text-on-secondary-container font-semibold"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {icon}
                        <span>{label}</span>
                      </span>
                      {selected && <IconCheck size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* M3 View Dropdown Menu (Windows Explorer layout options + pane toggles) */}
        <div className="relative" ref={viewMenuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isViewMenuOpen}
            onClick={() => setIsViewMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 min-h-[32px] rounded-m3-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-medium m3-pressable"
          >
            <IconGrid size={14} />
            <span>View: {VIEW_LABELS[viewMode]}</span>
            <IconChevronDown size={14} />
          </button>

          {isViewMenuOpen && (
            <div
              role="menu"
              aria-label="View options"
              className="absolute right-0 mt-1.5 w-56 bg-surface-container-high rounded-m3-md shadow-m3-2 p-1.5 z-50 text-xs animate-m3-popover"
              style={{ "--transform-origin": "top right" } as React.CSSProperties}
            >
              <div className="flex flex-col gap-0.5">
                {getViewOptions(nodeViewEnabled).map(({ mode, label, group }) => {
                  const selected = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        onViewModeChange(mode);
                        setIsViewMenuOpen(false);
                      }}
                      className={`w-full min-h-[32px] flex items-center gap-2 px-2.5 py-1.5 rounded-m3-sm text-left m3-pressable ${
                        selected
                          ? "bg-secondary-container text-on-secondary-container font-semibold"
                          : "text-on-surface hover:bg-surface-container-highest"
                      }`}
                    >
                      <span className="w-3 flex items-center justify-center shrink-0">
                        {selected && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-on-secondary-container"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <span className="flex-1">{label}</span>
                      {group === "experimental" && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-m3-full bg-tertiary-container text-on-tertiary-container">
                          Exp
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div role="separator" className="my-1.5 h-px bg-outline-variant/50" />

              <div className="flex flex-col gap-0.5">
                {(
                  [
                    {
                      id: "details-pane",
                      label: "Details pane",
                      checked: showDetailsPane,
                      onToggle: onToggleDetailsPane,
                    },
                    {
                      id: "preview-pane",
                      label: "Preview pane",
                      checked: showPreviewPane,
                      onToggle: onTogglePreviewPane,
                    },
                  ] as const
                ).map(({ id, label, checked, onToggle }) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    onClick={() => {
                      onToggle?.();
                      setIsViewMenuOpen(false);
                    }}
                    className={`w-full min-h-[32px] flex items-center justify-between px-2.5 py-1.5 rounded-m3-sm text-left m3-pressable ${
                      checked
                        ? "bg-secondary-container/70 text-on-secondary-container font-medium"
                        : "text-on-surface hover:bg-surface-container-highest"
                    }`}
                  >
                    <span className="pl-5">{label}</span>
                    {checked && <IconCheck size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default NavigationBar;
