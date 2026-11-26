import React, { useMemo, useState, useRef, useEffect } from "react";
import type { FileEntry, FolderEntry } from "../types";
import { FileTypeIcon, IconMoreVert } from "./ui";
import {
  EmptyFolderState,
  ItemCheckbox,
  formatDate,
  formatSize,
  getDroppedPaths,
  setItemDragData,
} from "./FileItemShared";

export interface FileTableViewProps {
  folders: FolderEntry[];
  files: FileEntry[];
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onToggleSelectAll: () => void;
  onNavigateFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
  emptyMessage?: string;
  onNewFolder?: () => void;
  onMoveItem?: (sourcePath: string, destDir: string) => void;
}

interface ListRowItem {
  path: string;
  name: string;
  isFolder: boolean;
  extension: string;
  modified_at: string;
  size: number;
}

/**
 * Calm Material 3 List View (56px rows, tonal hover, no borders or dividers).
 * Renders a flat list with folders first, then files.
 */
export const FileTableView: React.FC<FileTableViewProps> = ({
  folders,
  files,
  selectedPaths,
  onToggleSelect,
  onToggleSelectAll,
  onNavigateFolder,
  onOpenFile,
  onContextMenu,
  emptyMessage,
  onNewFolder,
  onMoveItem,
}) => {
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  const items = useMemo<ListRowItem[]>(() => {
    const folderRows: ListRowItem[] = folders.map((f) => ({
      path: f.path,
      name: f.name,
      isFolder: true,
      extension: "",
      modified_at: f.modified_at,
      size: -1,
    }));
    const fileRows: ListRowItem[] = files.map((f) => ({
      path: f.path,
      name: f.name,
      isFolder: false,
      extension: f.extension,
      modified_at: f.modified_at,
      size: f.size,
    }));
    return [...folderRows, ...fileRows];
  }, [folders, files]);

  const totalCount = items.length;
  const selectionActive = selectedPaths.size > 0;
  const allSelected = totalCount > 0 && selectedPaths.size === totalCount;
  const isIndeterminate = selectedPaths.size > 0 && selectedPaths.size < totalCount;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  if (totalCount === 0) {
    return <EmptyFolderState message={emptyMessage} onNewFolder={onNewFolder} />;
  }

  return (
    <div className="px-4 sm:px-6 pb-6 animate-m3-view-switch">
      {/* List Header with Select All */}
      <div className="grid grid-cols-[28px_1fr_120px_84px_32px] sm:grid-cols-[28px_1fr_140px_96px_32px] items-center gap-3 px-3 h-9 text-[11px] font-medium text-on-surface-variant select-none">
        <div className="flex items-center justify-center">
          <input
            ref={masterCheckboxRef}
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            aria-label="Select all items"
            className="w-4 h-4 rounded cursor-pointer accent-primary"
          />
        </div>
        <span>Name</span>
        <span className="hidden sm:block">Modified</span>
        <span className="hidden sm:block text-right">Size</span>
        <span />
      </div>

      {/* Flat List Rows */}
      <div role="list" className="space-y-0.5">
        {items.map((item) => {
          const isSelected = selectedPaths.has(item.path);
          const isDropTarget = item.isFolder && dragOverFolder === item.path;

          return (
            <div
              key={item.path}
              role="listitem"
              tabIndex={0}
              draggable={true}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (item.isFolder) {
                    onNavigateFolder(item.path);
                  } else {
                    onOpenFile(item.path);
                  }
                }
              }}
              onDragStart={(e) => setItemDragData(e, item.path, selectedPaths)}
              onDragOver={
                item.isFolder
                  ? (e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverFolder !== item.path) {
                        setDragOverFolder(item.path);
                      }
                    }
                  : undefined
              }
              onDragLeave={
                item.isFolder
                  ? (e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        if (dragOverFolder === item.path) setDragOverFolder(null);
                      }
                    }
                  : undefined
              }
              onDrop={
                item.isFolder
                  ? (e) => {
                      e.preventDefault();
                      setDragOverFolder(null);
                      if (onMoveItem) {
                        for (const src of getDroppedPaths(e)) {
                          if (src.toLowerCase() !== item.path.toLowerCase()) {
                            onMoveItem(src, item.path);
                          }
                        }
                      }
                    }
                  : undefined
              }
              onClick={() => onToggleSelect(item.path)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (item.isFolder) {
                  onNavigateFolder(item.path);
                } else {
                  onOpenFile(item.path);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e, item.path, item.isFolder);
              }}
              className={`group grid grid-cols-[28px_1fr_32px] sm:grid-cols-[28px_1fr_140px_96px_32px] items-center gap-3 px-3 h-[56px] rounded-m3-md cursor-pointer select-none transition-colors ${
                isDropTarget
                  ? "bg-primary-container text-on-primary-container"
                  : isSelected
                  ? "bg-secondary-container text-on-secondary-container"
                  : "hover:bg-surface-container-high text-on-surface"
              }`}
            >
              <div className="flex items-center justify-center">
                <ItemCheckbox
                  checked={isSelected}
                  selectionActive={selectionActive}
                  label={`Select ${item.name}`}
                  onToggle={() => onToggleSelect(item.path)}
                />
              </div>

              <div className="flex items-center gap-3 min-w-0">
                <FileTypeIcon
                  isFolder={item.isFolder}
                  extension={item.extension}
                  size={20}
                />
                <span className="text-[13px] font-medium truncate">
                  {item.name}
                </span>
              </div>

              <span className="hidden sm:block text-xs text-on-surface-variant truncate">
                {formatDate(item.modified_at)}
              </span>

              <span className="hidden sm:block text-xs text-on-surface-variant text-right tabular-nums">
                {item.isFolder ? "—" : formatSize(item.size)}
              </span>

              <button
                type="button"
                aria-label={`Actions for ${item.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onContextMenu(e, item.path, item.isFolder);
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <IconMoreVert size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FileTableView;
