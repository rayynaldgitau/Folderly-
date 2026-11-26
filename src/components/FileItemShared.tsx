import React from "react";
import type { FileEntry, FolderEntry } from "../types";
import { formatFileType } from "../utils/view";
import { Button, IconCheck, IconFolder, IconFolderPlus } from "./ui";

export interface FolderViewItem {
  path: string;
  name: string;
  isFolder: boolean;
  extension: string;
  typeLabel: string;
  modified_at: string;
  created_at: string;
  size: number;
}

/**
 * Normalizes folders and files into a single ordered item array (folders first).
 *
 * @param folders - Sorted folder entries.
 * @param files - Sorted file entries.
 * @returns Normalized FolderViewItem array.
 */
export function toFolderViewItems(
  folders: readonly FolderEntry[],
  files: readonly FileEntry[]
): FolderViewItem[] {
  const folderItems: FolderViewItem[] = folders.map((f) => ({
    path: f.path,
    name: f.name,
    isFolder: true,
    extension: "",
    typeLabel: formatFileType(true),
    modified_at: f.modified_at,
    created_at: f.created_at,
    size: -1,
  }));
  const fileItems: FolderViewItem[] = files.map((f) => ({
    path: f.path,
    name: f.name,
    isFolder: false,
    extension: f.extension,
    typeLabel: formatFileType(false, f.extension),
    modified_at: f.modified_at,
    created_at: f.created_at,
    size: f.size,
  }));
  return [...folderItems, ...fileItems];
}

/**
 * Computes shared M3 tonal surface classes for selectable/droppable items.
 *
 * @param isSelected - Whether the item is currently selected.
 * @param isDropTarget - Whether the item is an active folder drop target.
 * @param elevatedCard - Whether resting state uses a low-tonal card surface.
 * @returns Tailwind class string.
 */
export function getItemSurfaceClass(
  isSelected: boolean,
  isDropTarget: boolean,
  elevatedCard = false
): string {
  if (isDropTarget) {
    return "bg-primary-container text-on-primary-container";
  }
  if (isSelected) {
    return "bg-secondary-container text-on-secondary-container";
  }
  return elevatedCard
    ? "bg-surface-container-low hover:bg-surface-container-high text-on-surface"
    : "hover:bg-surface-container-high text-on-surface";
}

export interface ItemInteractionHandlers {
  item: FolderViewItem;
  selectedPaths: Set<string>;
  dragOverFolder: string | null;
  setDragOverFolder: (path: string | null) => void;
  onToggleSelect: (path: string) => void;
  onNavigateFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
  onMoveItem?: (sourcePath: string, destDir: string) => void;
}

/**
 * Builds shared keyboard, click, drag-and-drop, and context-menu handlers for any view item.
 *
 * @param params - Item and callback handlers.
 * @returns React DOM event props for the item container.
 */
export function getItemInteractionProps({
  item,
  selectedPaths,
  dragOverFolder,
  setDragOverFolder,
  onToggleSelect,
  onNavigateFolder,
  onOpenFile,
  onContextMenu,
  onMoveItem,
}: ItemInteractionHandlers) {
  return {
    tabIndex: 0,
    draggable: true,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (item.isFolder) {
          onNavigateFolder(item.path);
        } else {
          onOpenFile(item.path);
        }
      }
    },
    onDragStart: (e: React.DragEvent) => setItemDragData(e, item.path, selectedPaths),
    onDragOver: item.isFolder
      ? (e: React.DragEvent) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (dragOverFolder !== item.path) {
            setDragOverFolder(item.path);
          }
        }
      : undefined,
    onDragLeave: item.isFolder
      ? (e: React.DragEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (dragOverFolder === item.path) setDragOverFolder(null);
          }
        }
      : undefined,
    onDrop: item.isFolder
      ? (e: React.DragEvent) => {
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
      : undefined,
    onClick: () => onToggleSelect(item.path),
    onDoubleClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (item.isFolder) {
        onNavigateFolder(item.path);
      } else {
        onOpenFile(item.path);
      }
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu(e, item.path, item.isFolder);
    },
  };
}

/**
 * Formats byte count into human-readable size string.
 */
export function formatSize(bytes: number): string {
  if (bytes == null || isNaN(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/**
 * Formats ISO-8601 timestamp into a concise date string.
 */
export function formatDate(iso: string): string {
  if (!iso || iso === "unknown") return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso.split("T")[0] || "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Populates drag-and-drop data transfer payloads for one or more selected paths.
 */
export function setItemDragData(
  e: React.DragEvent,
  path: string,
  selectedPaths: Set<string>
): void {
  const isTargetSelected = selectedPaths.has(path);
  const pathsToDrag =
    isTargetSelected && selectedPaths.size > 1
      ? Array.from(selectedPaths)
      : [path];
  e.dataTransfer.setData("application/foldy-path", path);
  e.dataTransfer.setData("application/foldy-paths", JSON.stringify(pathsToDrag));
  e.dataTransfer.setData("application/folderly-path", path);
  e.dataTransfer.setData("text/plain", pathsToDrag.join("\n"));
  e.dataTransfer.effectAllowed = "move";
}

/**
 * Extracts dropped source paths from a drag event.
 */
export function getDroppedPaths(e: React.DragEvent): string[] {
  const pathsJson = e.dataTransfer.getData("application/foldy-paths");
  if (pathsJson) {
    try {
      const parsed = JSON.parse(pathsJson);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      // Fallback to single path
    }
  }
  const single =
    e.dataTransfer.getData("application/foldy-path") ||
    e.dataTransfer.getData("application/folderly-path") ||
    e.dataTransfer.getData("text/plain");
  return single ? [single] : [];
}

export interface ItemCheckboxProps {
  checked: boolean;
  selectionActive: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
}

/**
 * Subtle checkbox that appears on hover or when selection mode is active.
 */
export const ItemCheckbox: React.FC<ItemCheckboxProps> = ({
  checked,
  selectionActive,
  label,
  onToggle,
  className = "",
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    className={`inline-flex items-center justify-center w-5 h-5 rounded-m3-xs transition-opacity m3-pressable ${
      checked
        ? "bg-primary text-on-primary opacity-100"
        : selectionActive
        ? "bg-surface-container-highest text-transparent opacity-100 hover:bg-surface-container-high"
        : "bg-surface-container-highest text-transparent opacity-0 group-hover:opacity-100 focus:opacity-100"
    } ${className}`}
  >
    <IconCheck size={13} strokeWidth={2.5} />
  </button>
);

export interface EmptyFolderStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  onNewFolder?: () => void;
}

/**
 * Friendly empty state with icon, optional title, one line of copy, and optional New folder action.
 */
export const EmptyFolderState: React.FC<EmptyFolderStateProps> = ({
  title,
  message,
  icon,
  onNewFolder,
}) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-m3-view-switch">
    <div className="w-14 h-14 rounded-m3-lg bg-surface-container flex items-center justify-center text-on-surface-variant mb-4">
      {icon || <IconFolder size={26} />}
    </div>
    {title && (
      <h2 className="text-base font-medium text-on-surface mb-1">
        {title}
      </h2>
    )}
    <p className="text-sm text-on-surface-variant max-w-sm mb-4">
      {message || "This folder is empty."}
    </p>
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
  </div>
);
