import React from "react";
import { Button, IconCheck, IconFolder, IconFolderPlus } from "./ui";

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
  message?: string;
  onNewFolder?: () => void;
}

/**
 * Friendly empty folder state with icon, one line of copy, and New folder action.
 */
export const EmptyFolderState: React.FC<EmptyFolderStateProps> = ({
  message,
  onNewFolder,
}) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-m3-view-switch">
    <div className="w-14 h-14 rounded-m3-lg bg-surface-container flex items-center justify-center text-on-surface-variant mb-4">
      <IconFolder size={26} />
    </div>
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
