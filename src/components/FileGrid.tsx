import React, { useMemo, useState } from "react";
import type { FileEntry, FolderEntry, ViewMode } from "../types";
import { MacFolderIcon, MacFileIcon } from "./MacIcons";
import { StateView } from "./ui";

export interface FileGridProps {
  folders: FolderEntry[];
  files: FileEntry[];
  selectedPaths: Set<string>;
  viewMode: ViewMode;
  foldersFirst: boolean;
  onToggle: (path: string) => void;
  onToggleAll: () => void;
  onNavigateFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
  sortField?: string;
  emptyMessage?: string;
  onMoveItem?: (sourcePath: string, destDir: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  if (!iso || iso === "unknown") return "";
  return iso.split("T")[0];
}

/**
 * Material 3 FileGrid supporting grouped Cards and flat Grid views,
 * tonal surface cards, drag-and-drop, and accessible selection states.
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

  const renderFolderCard = (folder: FolderEntry) => {
    const isOver = dragOverFolder === folder.path;
    return (
      <div
        key={folder.path}
        role="button"
        tabIndex={0}
        draggable={true}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onNavigateFolder(folder.path);
          }
        }}
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
                  e.dataTransfer.getData("text/plain"),
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
        className={`rounded-m3-md p-3.5 cursor-pointer select-none group flex items-center gap-3 m3-state-surface m3-pressable ${
          isOver
            ? "bg-primary-container text-on-primary-container"
            : "bg-surface-container"
        }`}
        title={`${folder.name}\nClick to open (or drop items here to move)`}
      >
        <div className="shrink-0 pointer-events-none">
          <MacFolderIcon size={36} />
        </div>
        <div className="min-w-0 flex-1 pointer-events-none">
          <p className="text-xs font-semibold text-on-surface truncate leading-tight group-hover:text-primary transition-colors">
            {folder.name}
          </p>
          <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
            {formatDate(folder.modified_at)}
          </p>
        </div>
      </div>
    );
  };

  const renderFileCard = (file: FileEntry) => {
    const selected = selectedPaths.has(file.path);
    return (
      <div
        key={file.path}
        role="checkbox"
        aria-checked={selected}
        tabIndex={0}
        draggable={true}
        onKeyDown={(e) => {
          if (e.key === " ") {
            e.preventDefault();
            onToggle(file.path);
          } else if (e.key === "Enter") {
            e.preventDefault();
            onOpenFile(file.path);
          }
        }}
        onDragStart={(e) => {
          const isTargetSelected = selectedPaths.has(file.path);
          const pathsToDrag =
            isTargetSelected && selectedPaths.size > 1
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
        className={`rounded-m3-md p-3.5 cursor-grab active:cursor-grabbing select-none flex flex-col justify-between min-h-[92px] m3-state-surface m3-pressable ${
          selected
            ? "bg-primary-container text-on-primary-container"
            : "bg-surface-container"
        }`}
        title={`${file.name}\nDouble-click to open (or drag into a folder)`}
      >
        <div className="flex items-center gap-2.5 min-w-0 mb-3">
          <MacFileIcon extension={file.extension} size={30} />
          <p className="text-xs font-medium truncate leading-tight flex-1">
            {file.name}
          </p>
        </div>
        <div
          className={`flex items-center justify-between text-[11px] pt-1 ${
            selected ? "text-on-primary-container/80" : "text-on-surface-variant"
          }`}
        >
          <span>{formatSize(file.size)}</span>
          <span>{formatDate(file.modified_at)}</span>
        </div>
      </div>
    );
  };

  const renderFoldersSection = () => {
    if (folders.length === 0) return null;
    return (
      <section aria-label="Folders" className="space-y-3">
        <div className="flex items-center gap-2">
          <MacFolderIcon size={18} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface">
            Folders
          </h2>
          <span className="px-2.5 py-0.5 rounded-m3-full text-[11px] font-semibold bg-secondary-container text-on-secondary-container">
            {folders.length}
          </span>
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {folders.map(renderFolderCard)}
        </div>
      </section>
    );
  };

  const renderFilesSection = () => {
    if (files.length === 0) return null;

    if (viewMode === "grid") {
      return (
        <section aria-label="Files" className="space-y-3">
          <div className="flex items-center gap-2">
            <MacFileIcon size={18} />
            <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface">
              Files
            </h2>
            <span className="px-2.5 py-0.5 rounded-m3-full text-[11px] font-semibold bg-secondary-container text-on-secondary-container">
              {files.length}
            </span>
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {files.map(renderFileCard)}
          </div>
        </section>
      );
    }

    return (
      <div className="space-y-6">
        {fileGroups.map(([ext, groupFiles]) => (
          <section key={ext} aria-label={`${ext} files`} className="space-y-3">
            <div className="flex items-center gap-2">
              <MacFileIcon extension={ext} size={18} />
              <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                {ext}
              </h2>
              <span className="px-2.5 py-0.5 rounded-m3-full text-[11px] font-semibold bg-secondary-container text-on-secondary-container">
                {groupFiles.length}
              </span>
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {groupFiles.map(renderFileCard)}
            </div>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {folders.length === 0 && files.length === 0 ? (
        <StateView
          kind="empty"
          title="No items to display"
          description={emptyMessage || "This folder is empty or no files match your filter."}
        />
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
