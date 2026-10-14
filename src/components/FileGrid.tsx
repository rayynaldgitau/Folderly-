import React, { useMemo, useState } from "react";
import type { FileEntry, FolderEntry, ViewMode } from "../types";
import { MacFolderIcon, MacFileIcon } from "./MacIcons";

export interface FileGridProps {
  /** Folders inside the current directory. */
  folders: FolderEntry[];
  /** Files inside the current directory. */
  files: FileEntry[];
  /** Set of selected file paths. */
  selectedPaths: Set<string>;
  /** View layout mode (cards or grid). */
  viewMode: ViewMode;
  /** Whether folders should be rendered before files. */
  foldersFirst: boolean;
  /** Toggle selection of a file. */
  onToggle: (path: string) => void;
  /** Toggle selection of all files. */
  onToggleAll: () => void;
  /** Double-click navigation into a folder. */
  onNavigateFolder: (path: string) => void;
  /** Double-click execution of a file. */
  onOpenFile: (path: string) => void;
  /** Right-click context menu. */
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
  /** Optional sort field to order categories. */
  sortField?: string;
  /** Optional custom message when no items exist. */
  emptyMessage?: string;
  /** Callback fired when an item is dropped onto a folder. */
  onMoveItem?: (sourcePath: string, destDir: string) => void;
}

/** Formats byte size into human readable string like 158 MB */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/** Formats ISO timestamp to YYYY-MM-DD */
function formatDate(iso: string): string {
  if (!iso || iso === "unknown") return "";
  return iso.split("T")[0];
}

/**
 * Modern FileGrid matching the exact reference cards:
 * - FOLDERS section with count badge and rounded cards containing large pink folder icon, name & date
 * - FILE CATEGORIES section with count badge and rounded cards containing pink icon box, name, size & date
 */
const FileGrid: React.FC<FileGridProps> = ({
  folders,
  files,
  selectedPaths,
  viewMode,
  foldersFirst,
  onToggle,
  onNavigateFolder,
  onOpenFile,
  onContextMenu,
  sortField,
  emptyMessage,
  onMoveItem,
}) => {
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Group files by uppercase extension (e.g. EXE, PNG, PDF, etc.)
  const fileGroups = useMemo(() => {
    const map = new Map<string, FileEntry[]>();
    for (const file of files) {
      const ext = file.extension ? file.extension.toUpperCase() : "OTHER";
      const list = map.get(ext) || [];
      list.push(file);
      map.set(ext, list);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (sortField === "type") {
        return a[0].localeCompare(b[0]);
      }
      return b[1].length - a[1].length;
    });
  }, [files, sortField]);

  // Folders Section Component
  const renderFoldersSection = () => {
    if (folders.length === 0) return null;

    return (
      <section className="space-y-3">
        {/* Header: Folders */}
        <div className="flex items-center gap-2">
          <MacFolderIcon size={18} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary-color">
            Folders
          </h2>
          <span className="badge-count text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
            {folders.length} folders
          </span>
        </div>

        {/* 5-Column Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {folders.map((folder) => {
            const isOver = dragOverFolder === folder.path;
            return (
              <div
                key={folder.path}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/foldy-path", folder.path);
                  e.dataTransfer.setData("application/folderly-path", folder.path);
                  e.dataTransfer.setData("text/plain", folder.path);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverFolder !== folder.path) {
                    setDragOverFolder(folder.path);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverFolder === folder.path) {
                      setDragOverFolder(null);
                    }
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverFolder(null);
                  const pathsJson = e.dataTransfer.getData("application/foldy-paths");
                  const paths: string[] = pathsJson
                    ? JSON.parse(pathsJson)
                    : [
                        e.dataTransfer.getData("application/foldy-path") ||
                        e.dataTransfer.getData("application/folderly-path") ||
                        e.dataTransfer.getData("text/plain")
                      ].filter(Boolean);

                  if (onMoveItem) {
                    for (const src of paths) {
                      if (src && src.toLowerCase() !== folder.path.toLowerCase()) {
                        onMoveItem(src, folder.path);
                      }
                    }
                  }
                }}
                onClick={() => onNavigateFolder(folder.path)}
                onDoubleClick={() => onNavigateFolder(folder.path)}
                onContextMenu={(e) => onContextMenu(e, folder.path, true)}
                className={`bg-card hover:bg-card/90 rounded-2xl p-3.5 border cursor-pointer transition-all select-none group flex items-center gap-3 shadow-sm ${
                  isOver
                    ? "ring-2 ring-[#ff2d87] border-[#ff2d87] bg-[#ff2d87]/15 scale-[1.03]"
                    : "border-neutral-800/20 hover:border-[#ff2d87]/40"
                }`}
                title={`${folder.name}\nClick to open (or drop items here to move)`}
              >
                {/* macOS Style Folder Icon */}
                <div className="shrink-0 group-hover:scale-105 transition-transform pointer-events-none">
                  <MacFolderIcon size={36} />
                </div>
                <div className="min-w-0 flex-1 pointer-events-none">
                  <p className="text-xs font-semibold text-primary-color truncate leading-tight group-hover:text-[#ff2d87] transition-colors">
                    {folder.name}
                  </p>
                  <p className="text-[10px] text-muted-color truncate mt-0.5">
                    {formatDate(folder.modified_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  // Files Section Component
  const renderFilesSection = () => {
    if (files.length === 0) return null;

    if (viewMode === "grid") {
      return (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <MacFileIcon size={18} />
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary-color">
              Files
            </h2>
            <span className="badge-count text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
              {files.length} items
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {files.map((file) => {
              const selected = selectedPaths.has(file.path);

              return (
                <div
                  key={file.path}
                  draggable={true}
                  onDragStart={(e) => {
                    const isTargetSelected = selectedPaths.has(file.path);
                    const pathsToDrag = isTargetSelected && selectedPaths.size > 1
                      ? Array.from(selectedPaths)
                      : [file.path];
                    e.dataTransfer.setData("application/foldy-path", file.path);
                    e.dataTransfer.setData("application/foldy-paths", JSON.stringify(pathsToDrag));
                    e.dataTransfer.setData("application/folderly-path", file.path);
                    e.dataTransfer.setData("text/plain", pathsToDrag.join("\n"));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onToggle(file.path)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onOpenFile(file.path);
                  }}
                  onContextMenu={(e) => onContextMenu(e, file.path, false)}
                  className={`bg-card rounded-2xl p-3.5 border cursor-grab active:cursor-grabbing transition-all select-none flex flex-col justify-between shadow-sm ${
                    selected
                      ? "border-[#ff2d87] ring-1 ring-[#ff2d87]"
                      : "border-neutral-800/20 hover:border-[#ff2d87]/40"
                  }`}
                  title={`${file.name}\nDouble-click to open (or drag into a folder)`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 mb-3">
                    <MacFileIcon extension={file.extension} size={30} />
                    <p className="text-xs font-medium text-primary-color truncate">
                      {file.name}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-color border-t border-neutral-800/10 pt-1.5">
                    <span>{formatSize(file.size)}</span>
                    <span>{formatDate(file.modified_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    // Default Kanban Grouped Mode (exact match to screenshot)
    return (
      <div className="space-y-6">
        {fileGroups.map(([ext, groupFiles]) => {
          return (
            <section key={ext} className="space-y-3">
              {/* Group Header: e.g. EXE  [8 items] */}
              <div className="flex items-center gap-2">
                <MacFileIcon extension={ext} size={18} />
                <h2 className="text-xs font-bold uppercase tracking-wider text-primary-color">
                  {ext}
                </h2>
                <span className="badge-count text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                  {groupFiles.length} items
                </span>
              </div>

              {/* 5-Column Responsive Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {groupFiles.map((file) => {
                  const selected = selectedPaths.has(file.path);

                  return (
                    <div
                      key={file.path}
                      draggable={true}
                      onDragStart={(e) => {
                        const isTargetSelected = selectedPaths.has(file.path);
                        const pathsToDrag = isTargetSelected && selectedPaths.size > 1
                          ? Array.from(selectedPaths)
                          : [file.path];
                        e.dataTransfer.setData("application/foldy-path", file.path);
                        e.dataTransfer.setData("application/foldy-paths", JSON.stringify(pathsToDrag));
                        e.dataTransfer.setData("application/folderly-path", file.path);
                        e.dataTransfer.setData("text/plain", pathsToDrag.join("\n"));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => onToggle(file.path)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onOpenFile(file.path);
                      }}
                      onContextMenu={(e) => onContextMenu(e, file.path, false)}
                      className={`bg-card rounded-2xl p-3.5 border cursor-grab active:cursor-grabbing transition-all select-none flex flex-col justify-between shadow-sm min-h-[92px] ${
                        selected
                          ? "border-[#ff2d87] ring-1 ring-[#ff2d87]"
                          : "border-neutral-800/20 hover:border-[#ff2d87]/40"
                      }`}
                      title={`${file.name}\nDouble-click to open (or drag into a folder)`}
                    >
                      {/* Top Row: macOS File Icon + Filename */}
                      <div className="flex items-center gap-2.5 min-w-0 mb-3">
                        <MacFileIcon extension={file.extension} size={30} />
                        <p className="text-xs font-medium text-primary-color truncate leading-tight flex-1">
                          {file.name}
                        </p>
                      </div>

                      {/* Bottom Row: Size on left, Date on right */}
                      <div className="flex items-center justify-between text-[10px] text-muted-color border-t border-neutral-800/10 pt-1.5">
                        <span>{formatSize(file.size)}</span>
                        <span>{formatDate(file.modified_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {folders.length === 0 && files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-color">
          <span className="text-5xl mb-3">📭</span>
          <p className="text-sm font-medium">{emptyMessage || "This folder is empty."}</p>
        </div>
      ) : foldersFirst ? (
        <>
          {renderFoldersSection()}
          {renderFilesSection()}
        </>
      ) : (
        <>
          {renderFilesSection()}
          {renderFoldersSection()}
        </>
      )}
    </div>
  );
};

export default FileGrid;
