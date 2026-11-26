import React, { useMemo, useState } from "react";
import type { FileEntry, FolderEntry } from "../types";
import { FileTypeIcon } from "./ui";
import {
  EmptyFolderState,
  ItemCheckbox,
  getDroppedPaths,
  setItemDragData,
} from "./FileItemShared";

export interface FileGridProps {
  folders: FolderEntry[];
  files: FileEntry[];
  selectedPaths: Set<string>;
  onToggle: (path: string) => void;
  onNavigateFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onNewFolder?: () => void;
  onMoveItem?: (sourcePath: string, destDir: string) => void;
}

interface GridTileItem {
  path: string;
  name: string;
  isFolder: boolean;
  extension: string;
}

/**
 * Calm Material 3 Grid View: uniform fixed-aspect tiles, no borders,
 * tonal hover surface, folders first, flat layout without type grouping.
 */
const FileGrid: React.FC<FileGridProps> = ({
  folders,
  files,
  selectedPaths,
  onToggle,
  onNavigateFolder,
  onOpenFile,
  onContextMenu,
  emptyTitle,
  emptyMessage,
  emptyIcon,
  onNewFolder,
  onMoveItem,
}) => {
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const items = useMemo<GridTileItem[]>(() => {
    const folderTiles: GridTileItem[] = folders.map((f) => ({
      path: f.path,
      name: f.name,
      isFolder: true,
      extension: "",
    }));
    const fileTiles: GridTileItem[] = files.map((f) => ({
      path: f.path,
      name: f.name,
      isFolder: false,
      extension: f.extension,
    }));
    return [...folderTiles, ...fileTiles];
  }, [folders, files]);

  if (items.length === 0) {
    return (
      <EmptyFolderState
        title={emptyTitle}
        message={emptyMessage}
        icon={emptyIcon}
        onNewFolder={onNewFolder}
      />
    );
  }

  const selectionActive = selectedPaths.size > 0;

  return (
    <div className="px-4 sm:px-6 pb-6 pt-2 animate-m3-view-switch">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {items.map((item) => {
          const isSelected = selectedPaths.has(item.path);
          const isDropTarget = item.isFolder && dragOverFolder === item.path;

          return (
            <div
              key={item.path}
              role="button"
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
              onClick={() => onToggle(item.path)}
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
              title={item.name}
              className={`group relative aspect-[5/4] rounded-m3-lg p-3 flex flex-col items-center justify-between cursor-pointer select-none transition-colors m3-pressable ${
                isDropTarget
                  ? "bg-primary-container text-on-primary-container"
                  : isSelected
                  ? "bg-secondary-container text-on-secondary-container"
                  : "bg-surface-container-low hover:bg-surface-container-high text-on-surface"
              }`}
            >
              <div className="w-full flex items-start justify-start">
                <ItemCheckbox
                  checked={isSelected}
                  selectionActive={selectionActive}
                  label={`Select ${item.name}`}
                  onToggle={() => onToggle(item.path)}
                />
              </div>

              <div className="flex-1 flex items-center justify-center pointer-events-none">
                <FileTypeIcon
                  isFolder={item.isFolder}
                  extension={item.extension}
                  size={36}
                />
              </div>

              <p className="w-full text-center text-xs font-medium truncate pointer-events-none">
                {item.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FileGrid;
