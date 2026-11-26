import React, { useState } from "react";
import type { QuickAccessItem, FolderEntry, DiskUsage } from "../types";
import { MacFolderIcon, MacDriveIcon } from "./MacIcons";
import {
  IconClock,
  IconClose,
  IconDownload,
  IconFolder,
  IconHelp,
  IconPlus,
  IconSearch,
  IconSettings,
} from "./ui";

interface Props {
  selectedDir: string | null;
  fileCount: number;
  folderCount: number;
  quickAccess: QuickAccessItem[];
  currentFolders: FolderEntry[];
  onOpenUniversalSearch?: () => void;
  onNavigate: (path: string) => void;
  onClose?: () => void;
  pinnedFolders?: Array<{ name: string; path: string }>;
  onAddPinnedFolder?: () => void;
  onPinFolderPath?: (path: string) => void;
  onRemovePinnedFolder?: (path: string) => void;
  onReorderPinnedFolders?: (fromIndex: number, toIndex: number) => void;
  displayName?: string;
  workspaceName?: string;
  onOpenSettings?: () => void;
  /** Opens the interactive walkthrough and tutorial modal. */
  onOpenTutorials?: () => void;
  /** Callback fired when an item is dropped onto a destination folder. */
  onMoveItem?: (sourcePath: string, destDir: string) => void;
  /** Indicates whether a new version update is ready. */
  hasUpdateAvailable?: boolean;
  /** Real-time disk storage metrics for the active drive/volume. */
  diskUsage?: DiskUsage | null;
}

/**
 * Material 3 Navigation Drawer Sidebar with token-backed tonal surfaces,
 * accessible navigation landmarks, and 44-48px interactive rows.
 */
const Sidebar: React.FC<Props> = ({
  selectedDir,
  fileCount,
  quickAccess,
  onOpenUniversalSearch,
  onNavigate,
  pinnedFolders,
  onAddPinnedFolder,
  onPinFolderPath,
  onRemovePinnedFolder,
  onReorderPinnedFolders,
  displayName = "User",
  workspaceName = "Personal workspace",
  onOpenSettings,
  onOpenTutorials,
  onMoveItem,
  hasUpdateAvailable = false,
  diskUsage = null,
}) => {
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [isOverPinnedSection, setIsOverPinnedSection] = useState<boolean>(false);
  const [draggedPinnedIndex, setDraggedPinnedIndex] = useState<number | null>(null);
  const [dragOverPinnedIndex, setDragOverPinnedIndex] = useState<number | null>(null);

  const drives = quickAccess.filter((item) => item.is_drive);
  const findQA = (names: string[], fallback: string) =>
    quickAccess.find((q) => names.includes(q.name.toLowerCase()))?.path || fallback;

  const resolvedDesktopPath = findQA(["desktop"], "Desktop");
  const resolvedPicturesPath = findQA(["pictures", "photos"], "Pictures");
  const resolvedDownloadsPath = findQA(["downloads"], "Downloads");
  const resolvedDocumentsPath = findQA(["documents"], "Documents");
  const resolvedMusicPath = findQA(["music"], "Music");
  const resolvedVideosPath = findQA(["videos", "movies"], "Videos");
  const resolvedHomePath = findQA(["home"], "Home");

  const isMac =
    typeof navigator !== "undefined" &&
    (navigator.userAgent.includes("Mac") || navigator.platform.includes("Mac"));

  const effectivePinnedFolders =
    pinnedFolders && pinnedFolders.length > 0
      ? pinnedFolders
      : [
          { name: "Documents", path: resolvedDocumentsPath },
          { name: "Downloads", path: resolvedDownloadsPath },
          { name: "Desktop", path: resolvedDesktopPath },
        ];

  const standardQuickAccess = [
    { name: "Recents", icon: <IconClock size={17} />, path: "recents" },
    { name: "Home", icon: <IconFolder size={17} />, path: resolvedHomePath },
    { name: "Desktop", icon: <IconFolder size={17} />, path: resolvedDesktopPath },
    { name: "Downloads", icon: <IconDownload size={17} />, path: resolvedDownloadsPath },
    { name: "Documents", icon: <IconFolder size={17} />, path: resolvedDocumentsPath },
    { name: "Photos & Pictures", icon: <IconFolder size={17} />, path: resolvedPicturesPath },
    { name: "Music", icon: <IconFolder size={17} />, path: resolvedMusicPath },
    { name: "Videos", icon: <IconFolder size={17} />, path: resolvedVideosPath },
  ];

  const usedPct = Math.min(100, Math.max(0, diskUsage?.used_percentage ?? 0));

  return (
    <aside
      aria-label="Primary sidebar navigation"
      className="w-72 sm:w-64 shrink-0 flex flex-col bg-surface-container-low select-none overflow-hidden text-on-surface z-10"
    >
      {/* 1. User Workspace Header */}
      <div className="p-3 pb-2">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open profile and workspace settings"
          className="w-full min-h-[48px] flex items-center justify-between p-2.5 rounded-m3-md bg-surface-container m3-state-surface text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-m3-full bg-primary text-on-primary font-bold flex items-center justify-center text-sm shrink-0">
              {(displayName || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-on-surface truncate leading-tight">
                {displayName || "User"}
              </p>
              <p className="text-[11px] text-on-surface-variant truncate leading-tight mt-0.5">
                {workspaceName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasUpdateAvailable && (
              <span className="px-2 py-0.5 rounded-m3-full bg-primary text-on-primary text-[10px] font-bold">
                NEW
              </span>
            )}
            <IconSettings size={16} className="text-on-surface-variant" />
          </div>
        </button>
      </div>

      {/* 2. Search Laptop Trigger */}
      <div className="px-3 py-1.5">
        <button
          type="button"
          onClick={onOpenUniversalSearch}
          aria-label="Search files and folders across your laptop (Ctrl+K)"
          className="w-full min-h-[44px] flex items-center gap-2.5 px-3.5 rounded-m3-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface text-xs font-medium m3-pressable"
        >
          <IconSearch size={16} className="text-primary shrink-0" />
          <span className="flex-1 text-left truncate">Search Laptop...</span>
          <kbd className="px-1.5 py-0.5 bg-surface-container rounded-m3-xs text-[10px] text-on-surface-variant font-mono shrink-0">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* 3. Scrollable Navigation Sections */}
      <nav aria-label="Folders and drives" className="flex-1 overflow-y-auto px-3 py-2 space-y-5 text-xs">
        {/* Quick Access */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant px-3 mb-1.5">
            Quick Access
          </p>
          <div className="space-y-0.5">
            {standardQuickAccess.map((item) => {
              const isActive =
                selectedDir &&
                (selectedDir === item.path ||
                  (item.path !== "recents" &&
                    selectedDir.toLowerCase().endsWith(item.name.toLowerCase())));
              const isOver = dragOverPath === item.path;

              return (
                <button
                  key={item.name}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => item.path && onNavigate(item.path)}
                  onDragOver={(e) => {
                    if (item.path && item.path !== "recents") {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverPath !== item.path) setDragOverPath(item.path);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverPath === item.path) setDragOverPath(null);
                  }}
                  onDrop={(e) => {
                    if (item.path && item.path !== "recents") {
                      e.preventDefault();
                      setDragOverPath(null);
                      const src =
                        e.dataTransfer.getData("application/foldy-path") ||
                        e.dataTransfer.getData("application/folderly-path") ||
                        e.dataTransfer.getData("text/plain");
                      if (src && src.toLowerCase() !== item.path.toLowerCase() && onMoveItem) {
                        onMoveItem(src, item.path);
                      }
                    }
                  }}
                  className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-m3-full text-xs font-medium m3-pressable ${
                    isOver
                      ? "bg-primary-container text-on-primary-container font-semibold"
                      : isActive
                      ? "bg-secondary-container text-on-secondary-container font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span className={isActive ? "text-on-secondary-container" : "text-on-surface-variant"}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  {isActive && fileCount > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-m3-full bg-primary/15 text-primary font-semibold">
                      {fileCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pinned Folders */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            if (!isOverPinnedSection) setIsOverPinnedSection(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsOverPinnedSection(false);
            }
          }}
          onDrop={(e) => {
            setIsOverPinnedSection(false);
            const fromIndexStr = e.dataTransfer.getData("application/foldy-pinned-index");
            if (!fromIndexStr) {
              e.preventDefault();
              const src =
                e.dataTransfer.getData("application/foldy-path") ||
                e.dataTransfer.getData("application/folderly-path") ||
                e.dataTransfer.getData("text/plain");
              if (src && onPinFolderPath) {
                onPinFolderPath(src);
              }
            }
          }}
          className={`rounded-m3-md transition-colors ${
            isOverPinnedSection ? "bg-primary-container/30 p-1" : ""
          }`}
        >
          <div className="flex items-center justify-between px-3 mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Pinned Folders
            </p>
            {onAddPinnedFolder && (
              <button
                type="button"
                onClick={onAddPinnedFolder}
                aria-label="Pin current folder to sidebar"
                title="Pin current folder"
                className="inline-flex items-center justify-center w-8 h-8 rounded-m3-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high m3-pressable"
              >
                <IconPlus size={14} />
              </button>
            )}
          </div>
          <div className="space-y-0.5">
            {effectivePinnedFolders.map((p, index) => {
              const isOver = dragOverPath === p.path || dragOverPinnedIndex === index;
              const isDragging = draggedPinnedIndex === index;

              return (
                <div
                  key={p.path}
                  role="button"
                  tabIndex={0}
                  draggable={true}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onNavigate(p.path);
                    }
                  }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/foldy-pinned-index", String(index));
                    e.dataTransfer.setData("application/foldy-path", p.path);
                    e.dataTransfer.setData("text/plain", p.path);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggedPinnedIndex(index);
                  }}
                  onDragEnd={() => {
                    setDraggedPinnedIndex(null);
                    setDragOverPinnedIndex(null);
                    setDragOverPath(null);
                  }}
                  onClick={() => onNavigate(p.path)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverPinnedIndex !== index) setDragOverPinnedIndex(index);
                    if (dragOverPath !== p.path) setDragOverPath(p.path);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      if (dragOverPinnedIndex === index) setDragOverPinnedIndex(null);
                      if (dragOverPath === p.path) setDragOverPath(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverPinnedIndex(null);
                    setDragOverPath(null);
                    setDraggedPinnedIndex(null);

                    const fromIndexStr = e.dataTransfer.getData("application/foldy-pinned-index");
                    if (fromIndexStr !== "") {
                      const fromIndex = parseInt(fromIndexStr, 10);
                      if (!isNaN(fromIndex) && fromIndex !== index && onReorderPinnedFolders) {
                        onReorderPinnedFolders(fromIndex, index);
                        return;
                      }
                    }

                    const src =
                      e.dataTransfer.getData("application/foldy-path") ||
                      e.dataTransfer.getData("application/folderly-path") ||
                      e.dataTransfer.getData("text/plain");
                    if (src && src.toLowerCase() !== p.path.toLowerCase() && onMoveItem) {
                      onMoveItem(src, p.path);
                    }
                  }}
                  className={`w-full min-h-[40px] flex items-center justify-between px-3 py-1.5 rounded-m3-full text-xs text-on-surface hover:bg-surface-container-high cursor-grab active:cursor-grabbing group ${
                    isDragging ? "opacity-40" : ""
                  } ${
                    isOver ? "bg-primary-container text-on-primary-container font-semibold" : ""
                  }`}
                  title={`${p.path}\nClick to browse, drag to reorder, or drop items to move`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate pointer-events-none">
                    <MacFolderIcon size={16} />
                    <span className="truncate">{p.name}</span>
                  </div>
                  {onRemovePinnedFolder && (
                    <button
                      type="button"
                      aria-label={`Unpin ${p.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePinnedFolder(p.path);
                      }}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-7 h-7 flex items-center justify-center rounded-m3-full text-on-surface-variant hover:text-error hover:bg-error-container/50 shrink-0"
                    >
                      <IconClose size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Drives */}
        {drives.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant px-3 mb-1.5">
              {isMac ? "Locations" : "This PC"}
            </p>
            <div className="space-y-0.5">
              {drives.map((d) => (
                <button
                  key={d.path}
                  type="button"
                  onClick={() => onNavigate(d.path)}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-1.5 rounded-m3-full text-xs text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface truncate m3-pressable"
                  title={d.path}
                >
                  <MacDriveIcon size={16} />
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* 4. Bottom Storage Widget & Utility Actions */}
      <div className="p-3 pt-4 space-y-2">
        <button
          type="button"
          onClick={() => diskUsage?.mount_path && onNavigate(diskUsage.mount_path)}
          className="w-full p-3 rounded-m3-md bg-surface-container text-left m3-state-surface select-none"
          title={
            diskUsage
              ? `${diskUsage.drive_name} (${diskUsage.mount_path})\n${diskUsage.free_formatted} free of ${diskUsage.total_formatted} (${usedPct}% used)`
              : "Local Storage"
          }
        >
          <div className="flex items-center justify-between text-xs font-semibold text-on-surface mb-2">
            <div className="flex items-center gap-2 truncate">
              <MacDriveIcon size={18} />
              <span className="truncate">
                {diskUsage?.drive_name || (isMac ? "Macintosh HD" : "Local Disk (C:)")}
              </span>
            </div>
            {diskUsage && (
              <span className="text-[11px] text-on-surface-variant font-mono shrink-0 ml-1">
                {usedPct}%
              </span>
            )}
          </div>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-m3-full overflow-hidden mb-1.5">
            <div
              className={`h-full rounded-m3-full transition-all duration-300 ${
                usedPct > 90 ? "bg-warning" : "bg-primary"
              }`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>{diskUsage ? `${diskUsage.free_formatted} free` : "Loading storage..."}</span>
            <span>{diskUsage ? `of ${diskUsage.total_formatted}` : ""}</span>
          </div>
        </button>

        {onOpenTutorials && (
          <button
            type="button"
            onClick={onOpenTutorials}
            className="w-full min-h-[40px] flex items-center justify-between px-3 py-1.5 rounded-m3-full text-xs font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface m3-pressable"
          >
            <span className="flex items-center gap-2.5">
              <IconHelp size={16} />
              <span>Tutorials & Guide</span>
            </span>
            <span className="text-[11px] text-on-surface-variant font-mono">Tour</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full min-h-[40px] flex items-center justify-between px-3 py-1.5 rounded-m3-full text-xs font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface m3-pressable"
        >
          <span className="flex items-center gap-2.5">
            <IconSettings size={16} />
            <span>Settings</span>
          </span>
          {hasUpdateAvailable && (
            <span className="px-2 py-0.5 rounded-m3-full bg-primary text-on-primary text-[10px] font-bold">
              UPDATE
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
