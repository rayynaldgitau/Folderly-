import React, { useState } from "react";
import type { QuickAccessItem, FolderEntry } from "../types";
import { MacFolderIcon } from "./MacIcons";

interface Props {
  selectedDir: string | null;
  fileCount: number;
  folderCount: number;
  quickAccess: QuickAccessItem[];
  currentFolders: FolderEntry[];
  onOpenFolder: () => void;
  onNavigate: (path: string) => void;
  onClose?: () => void;
  pinnedFolders?: Array<{ name: string; path: string }>;
  onAddPinnedFolder?: () => void;
  onRemovePinnedFolder?: (path: string) => void;
  displayName?: string;
  workspaceName?: string;
  onOpenSettings?: () => void;
  /** Callback fired when an item is dropped onto a destination folder. */
  onMoveItem?: (sourcePath: string, destDir: string) => void;
}

/**
 * Modern Sidebar component matching the exact mockup layout.
 *
 * Features:
 * - User workspace profile header (Avatar + name + workspace)
 * - Hot pink "Open Folder" button
 * - Quick Access with active hot pink item fill and count badge
 * - Pinned Folders section with "+" button
 * - This PC / Drives list
 * - Storage usage progress widget
 * - Settings action item
 */
const Sidebar: React.FC<Props> = ({
  selectedDir,
  fileCount,
  quickAccess,
  onOpenFolder,
  onNavigate,
  pinnedFolders,
  onAddPinnedFolder,
  onRemovePinnedFolder,
  displayName = "Raynald Gitau",
  workspaceName = "Personal workspace",
  onOpenSettings,
  onMoveItem,
}) => {
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
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
                {displayName}
              </p>
              <p className="text-[10px] text-muted-color truncate leading-tight mt-0.5">
                {workspaceName}
              </p>
            </div>
          </div>
          <span className="text-muted-color text-xs px-1">⚙️</span>
        </div>
      </div>

      {/* ── 2. Open Folder Button (Solid Hot Pink) ── */}
      <div className="px-3.5 py-1.5">
        <button
          onClick={onOpenFolder}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#ff2d87] hover:bg-[#e61b74] text-white text-xs font-bold shadow-md shadow-[#ff2d87]/20 transition-all active:scale-[0.98]"
        >
          <span>📂</span>
          <span>Open Folder</span>
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

        {/* PINNED FOLDERS Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-color">
              Pinned Folders
            </p>
            <button
              onClick={onAddPinnedFolder}
              className="text-muted-color hover:text-[#ff2d87] text-xs font-bold"
              title="Pin a folder"
            >
              +
            </button>
          </div>
          <div className="space-y-0.5">
            {effectivePinnedFolders.map((p) => {
              const isOver = dragOverPath === p.path;
              return (
                <div
                  key={p.path}
                  onClick={() => onNavigate(p.path)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverPath !== p.path) setDragOverPath(p.path);
                  }}
                  onDragLeave={() => {
                    if (dragOverPath === p.path) setDragOverPath(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverPath(null);
                    const src =
                      e.dataTransfer.getData("application/folderly-path") ||
                      e.dataTransfer.getData("text/plain");
                    if (src && src.toLowerCase() !== p.path.toLowerCase() && onMoveItem) {
                      onMoveItem(src, p.path);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-primary-color hover:bg-card hover:text-[#ff2d87] transition-all cursor-pointer group ${
                    isOver ? "ring-2 ring-[#ff2d87] bg-[#ff2d87]/20 font-bold" : ""
                  }`}
                  title={p.path}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
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
              This PC
            </p>
            <div className="space-y-0.5">
              {drives.map((d) => (
                <button
                  key={d.path}
                  onClick={() => onNavigate(d.path)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs text-primary-color hover:bg-card hover:text-[#ff2d87] transition-all truncate"
                  title={d.path}
                >
                  <span className="text-sm">💾</span>
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Bottom Storage Widget & Settings ── */}
      <div className="p-3 border-t border-neutral-800/40 space-y-2">
        {/* Storage Widget Card */}
        <div className="p-2.5 rounded-xl bg-card border border-neutral-800/30">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-color mb-1.5">
            <span>💾</span>
            <span>Local Disk (C:)</span>
          </div>
          {/* Pink Progress Bar */}
          <div className="w-full h-1.5 bg-neutral-700/30 rounded-full overflow-hidden mb-1">
            <div
              className="h-full bg-[#ff2d87] rounded-full"
              style={{ width: "35%" }}
            />
          </div>
          <p className="text-[10px] text-muted-color">128 GB free of 512 GB</p>
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-primary-color hover:bg-card hover:text-[#ff2d87] transition-all"
        >
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
