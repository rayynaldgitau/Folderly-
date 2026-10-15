import React, { useState } from "react";
import type { QuickAccessItem, FolderEntry, DiskUsage } from "../types";
import { MacFolderIcon, MacDriveIcon } from "./MacIcons";

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
 * Modern Sidebar component matching the exact mockup layout.
 *
 * Features:
 * - User workspace profile header (Avatar + name + workspace)
 * - Persistent Search Laptop feature
 * - Quick Access with active item fill and count badge
 * - Pinned Folders section with drag-to-pin and drag-to-reorder
 * - This PC / Drives list
 * - Storage usage progress widget
 * - Settings action item
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
  const desktopItem = quickAccess.find((q) => q.name.toLowerCase() === "desktop");
  const picturesItem = quickAccess.find(
    (q) => q.name.toLowerCase() === "pictures" || q.name.toLowerCase() === "photos"
  );
  const downloadsItem = quickAccess.find((q) => q.name.toLowerCase() === "downloads");
  const documentsItem = quickAccess.find((q) => q.name.toLowerCase() === "documents");
  const musicItem = quickAccess.find((q) => q.name.toLowerCase() === "music");
  const videosItem = quickAccess.find(
    (q) => q.name.toLowerCase() === "videos" || q.name.toLowerCase() === "movies"
  );
  const homeItem = quickAccess.find((q) => q.name.toLowerCase() === "home");

  const resolvedDesktopPath = desktopItem?.path || "Desktop";
  const resolvedPicturesPath = picturesItem?.path || "Pictures";
  const resolvedDownloadsPath = downloadsItem?.path || "Downloads";
  const resolvedDocumentsPath = documentsItem?.path || "Documents";
  const resolvedMusicPath = musicItem?.path || "Music";
  const resolvedVideosPath = videosItem?.path || "Videos";
  const resolvedHomePath = homeItem?.path || "Home";

  const isMac =
    typeof navigator !== "undefined" &&
    (navigator.userAgent.includes("Mac") || navigator.platform.includes("Mac"));

  /**
   * Checks whether a drive name or filesystem path corresponds to a macOS drive or volume.
   *
   * @param name - Drive label string.
   * @param path - Filesystem volume path.
   * @returns True if the volume corresponds to a macOS volume or root.
   */
  const isMacDrive = (name?: string, path?: string): boolean => {
    if (!name && !path) return isMac;
    const n = (name || "").toLowerCase();
    const p = (path || "").toLowerCase();
    return (
      n.includes("mac") ||
      n.includes("apple") ||
      p === "/" ||
      p.startsWith("/volumes") ||
      (isMac && !p.match(/^[a-z]:/i))
    );
  };

  const effectivePinnedFolders = pinnedFolders && pinnedFolders.length > 0
    ? pinnedFolders
    : [
        { name: "Documents", path: resolvedDocumentsPath },
        { name: "Downloads", path: resolvedDownloadsPath },
        { name: "Desktop", path: resolvedDesktopPath },
      ];

  // Default Quick Access standard locations with reliable dynamic resolution
  const standardQuickAccess = [
    { name: "Recents", icon: "🕒", path: "recents" },
    { name: "Home", icon: "🏠", path: resolvedHomePath },
    { name: "Desktop", icon: "🖥️", path: resolvedDesktopPath },
    { name: "Downloads", icon: "📥", path: resolvedDownloadsPath },
    { name: "Documents", icon: "📁", path: resolvedDocumentsPath },
    { name: "Photos & Pictures", icon: "🖼️", path: resolvedPicturesPath },
    { name: "Music", icon: "🎵", path: resolvedMusicPath },
    { name: "Videos", icon: "🎬", path: resolvedVideosPath },
  ].map((sq) => {
    if (sq.path === "recents") {
      return sq;
    }
    const found = quickAccess.find((q) => {
      const qLower = q.name.toLowerCase();
      const sqLower = sq.name.toLowerCase();
      return (
        qLower === sqLower ||
        (sqLower.includes("pictures") && (qLower === "pictures" || qLower === "photos")) ||
        (sqLower.includes("videos") && (qLower === "videos" || qLower === "movies"))
      );
    });
    return {
      name: sq.name,
      icon: sq.icon,
      path: found && found.path ? found.path : sq.path,
    };
  });

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-sidebar border-r border-neutral-800/40 select-none overflow-hidden text-neutral-300 z-10 transition-colors">
      {/* ── 1. User Workspace Header ── */}
      <div className="p-3.5 pb-2">
        <div
          onClick={onOpenSettings}
          className="flex items-center justify-between p-2 rounded-xl bg-card border border-neutral-800/30 hover:border-[#ff2d87]/40 transition-colors cursor-pointer group"
          title="Click to manage profile and preferences"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar Circle with Pink Background */}
            <div className="w-8 h-8 rounded-full bg-[#ff2d87] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              {(displayName || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary-color truncate leading-tight group-hover:text-[#ff2d87] transition-colors">
                {displayName || "User"}
              </p>
              <p className="text-[10px] text-muted-color truncate leading-tight mt-0.5">
                {workspaceName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasUpdateAvailable && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#ff2d87] text-white text-[9px] font-bold tracking-tight animate-pulse shadow-sm">
                UPDATE
              </span>
            )}
            <span className="text-muted-color text-xs px-1">⚙️</span>
          </div>
        </div>
      </div>

      {/* ── 2. Search Laptop (Persistent in Sidebar) ── */}
      <div className="px-3.5 py-1.5">
        <button
          onClick={onOpenUniversalSearch}
          className="w-full flex items-center gap-2.5 py-2 px-3 rounded-xl bg-card border border-neutral-800/40 hover:border-[#ff2d87]/50 text-neutral-300 hover:text-white text-xs font-medium transition-all shadow-sm group active:scale-[0.98]"
          title="Search files and folders across your laptop (Ctrl+K)"
        >
          <span className="text-[#ff2d87] group-hover:scale-110 transition-transform text-sm shrink-0">🔍</span>
          <span className="flex-1 text-left text-muted-color group-hover:text-primary-color font-medium truncate">
            Search Laptop...
          </span>
          <kbd className="px-1.5 py-0.5 bg-black/40 border border-neutral-700/60 rounded text-[9px] text-muted-color font-mono shrink-0">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* ── 3. Scrollable Sidebar Navigation ── */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-4 text-xs no-scrollbar">
        {/* QUICK ACCESS Section */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-color px-2 mb-1.5">
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
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    isOver
                      ? "ring-2 ring-[#ff2d87] bg-[#ff2d87]/20 text-[#ff2d87] font-bold"
                      : isActive
                      ? "bg-[#ff2d87] text-white font-bold shadow-sm shadow-[#ff2d87]/30"
                      : "text-primary-color hover:bg-card hover:text-[#ff2d87]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-sm">{item.icon}</span>
                    <span className="truncate">{item.name}</span>
                  </div>
                  {isActive && fileCount > 0 && (
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      {fileCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* PINNED FOLDERS Section (Accepts dropped folders to pin, plus drag-to-reorder) */}
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
              // It's a folder being dropped to pin it!
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
          className={`rounded-2xl transition-all ${
            isOverPinnedSection ? "ring-2 ring-[#ff2d87] bg-[#ff2d87]/10 p-1" : ""
          }`}
        >
          <div className="flex items-center justify-between px-2 mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-color">
              Pinned Folders
            </p>
            <button
              onClick={onAddPinnedFolder}
              className="text-muted-color hover:text-[#ff2d87] text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-card transition-colors"
              title="Pin current folder to sidebar"
            >
              +
            </button>
          </div>
          <div className="space-y-0.5">
            {effectivePinnedFolders.map((p, index) => {
              const isOver = dragOverPath === p.path || dragOverPinnedIndex === index;
              const isDragging = draggedPinnedIndex === index;

              return (
                <div
                  key={p.path}
                  draggable={true}
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

                    // Move dropped item into this pinned folder
                    const src =
                      e.dataTransfer.getData("application/foldy-path") ||
                      e.dataTransfer.getData("application/folderly-path") ||
                      e.dataTransfer.getData("text/plain");
                    if (src && src.toLowerCase() !== p.path.toLowerCase() && onMoveItem) {
                      onMoveItem(src, p.path);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-primary-color hover:bg-card hover:text-[#ff2d87] transition-all cursor-grab active:cursor-grabbing group ${
                    isDragging ? "opacity-40" : ""
                  } ${
                    isOver ? "ring-2 ring-[#ff2d87] bg-[#ff2d87]/20 font-bold scale-[1.02]" : ""
                  }`}
                  title={`${p.path}\nClick to browse, drag to rearrange, or drop items here to move them`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate pointer-events-none">
                    <MacFolderIcon size={16} />
                    <span className="truncate">{p.name}</span>
                  </div>
                  {onRemovePinnedFolder && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePinnedFolder(p.path);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded text-[10px] shrink-0"
                      title="Unpin folder"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* THIS PC / DRIVES Section */}
        {drives.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-color px-2 mb-1.5">
              {isMac ? "Locations" : "This PC"}
            </p>
            <div className="space-y-0.5">
              {drives.map((d) => (
                <button
                  key={d.path}
                  onClick={() => onNavigate(d.path)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs text-primary-color hover:bg-card hover:text-[#ff2d87] transition-all truncate"
                  title={d.path}
                >
                  {isMacDrive(d.name, d.path) ? (
                    <MacDriveIcon size={16} />
                  ) : (
                    <span className="text-sm">💾</span>
                  )}
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Bottom Storage Widget & Settings ── */}
      <div className="p-3 border-t border-neutral-800/40 space-y-2">
        {/* Storage Widget Card (dynamic real storage visualization) */}
        <div
          onClick={() => diskUsage?.mount_path && onNavigate(diskUsage.mount_path)}
          className="p-2.5 rounded-xl bg-card border border-neutral-800/30 hover:border-[#ff2d87]/40 cursor-pointer transition-all group select-none"
          title={
            diskUsage
              ? `${diskUsage.drive_name} (${diskUsage.mount_path})\n${diskUsage.free_formatted} free of ${diskUsage.total_formatted} (${diskUsage.used_percentage}% used)\nClick to view drive root`
              : "Local Storage"
          }
        >
          <div className="flex items-center justify-between text-xs font-semibold text-primary-color mb-1.5">
            <div className="flex items-center gap-2 truncate">
              {isMacDrive(diskUsage?.drive_name, diskUsage?.mount_path) ? (
                <MacDriveIcon size={18} />
              ) : (
                <span>💾</span>
              )}
              <span className="truncate group-hover:text-[#ff2d87] transition-colors">
                {diskUsage?.drive_name || (isMac ? "Macintosh HD" : "Local Disk (C:)")}
              </span>
            </div>
            {diskUsage && (
              <span className="text-[10px] text-muted-color font-mono shrink-0 ml-1">
                {diskUsage.used_percentage}%
              </span>
            )}
          </div>
          {/* Progress Bar with theme accent and high-capacity warning */}
          <div className="w-full h-1.5 bg-neutral-700/30 rounded-full overflow-hidden mb-1">
            <div
              className={`h-full rounded-full transition-all duration-500 storage-progress-bar ${
                (diskUsage?.used_percentage ?? 0) > 90
                  ? "bg-amber-500"
                  : "bg-[#ff2d87]"
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, diskUsage?.used_percentage ?? 0))}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-color">
            <span>{diskUsage ? `${diskUsage.free_formatted} free` : "Loading storage..."}</span>
            <span>{diskUsage ? `of ${diskUsage.total_formatted}` : ""}</span>
          </div>
        </div>

        {/* Tutorials & Guide Button */}
        {onOpenTutorials && (
          <button
            onClick={onOpenTutorials}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-primary-color hover:bg-card hover:text-[#ff2d87] transition-all group"
            title="Open Interactive Tutorials & Guide"
          >
            <div className="flex items-center gap-2.5">
              <span>🎓</span>
              <span>Tutorials & Guide</span>
            </div>
            <span className="text-[10px] text-muted-color font-mono group-hover:text-primary-color">
              Tour
            </span>
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-primary-color hover:bg-card hover:text-[#ff2d87] transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <span>⚙️</span>
            <span>Settings</span>
          </div>
          {hasUpdateAvailable && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#ff2d87] text-white text-[9px] font-bold tracking-tight shadow-sm">
              UPDATE
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
