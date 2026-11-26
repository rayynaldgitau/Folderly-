import React, { useState, useMemo, useRef, useEffect } from "react";
import type { FolderEntry, FileEntry } from "../types";
import { MacFolderIcon, MacFileIcon } from "./MacIcons";

/**
 * Props for the FileTableView component.
 */
export interface FileTableViewProps {
  /** List of subdirectories in the current folder. */
  folders: FolderEntry[];
  /** List of files in the current folder. */
  files: FileEntry[];
  /** Set of paths that are currently selected. */
  selectedPaths: Set<string>;
  /**
   * Controls whether folders appear before files in the table list.
   * When true, folders always appear above files.
   * When false, files always appear above folders.
   */
  foldersFirst: boolean;
  /** Callback fired when a single item's selection is toggled. */
  onToggleSelect: (path: string) => void;
  /** Callback fired to toggle selection across all items. */
  onToggleSelectAll: () => void;
  /** Callback fired when navigating into a folder (e.g. on double-click). */
  onNavigateFolder: (path: string) => void;
  /** Callback fired when opening a file (e.g. on double-click). */
  onOpenFile: (path: string) => void;
  /** Callback fired when invoking the context menu (via right-click or three-dot button). */
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
  /** Optional custom message when no items exist. */
  emptyMessage?: string;
  /** Callback fired when an item is dropped onto a folder row. */
  onMoveItem?: (sourcePath: string, destDir: string) => void;
}

/** Available column keys for table sorting. */
export type SortColumn = "name" | "date" | "type" | "size";

/** Direction of the active sort. */
export type SortDirection = "asc" | "desc";

/** Unified representation of an item for table rendering and sorting. */
interface TableRowItem {
  id: string;
  path: string;
  name: string;
  isFolder: boolean;
  modified_at: string;
  extension: string;
  type: string;
  size: number;
  formattedSize: string;
}

/** Extension-to-emoji mapping for quick visual recognition. */
const EXT_ICON_MAP: Record<string, string> = {
  pdf: "📄",
  png: "🖼",
  jpg: "🖼",
  jpeg: "🖼",
  gif: "🖼",
  webp: "🖼",
  svg: "🖼",
  mp3: "🎵",
  wav: "🎵",
  flac: "🎵",
  ogg: "🎵",
  mp4: "🎬",
  mov: "🎬",
  mkv: "🎬",
  avi: "🎬",
  zip: "🗜",
  rar: "🗜",
  "7z": "🗜",
  tar: "🗜",
  gz: "🗜",
  js: "📜",
  ts: "📜",
  jsx: "📜",
  tsx: "📜",
  rs: "🦀",
  py: "🐍",
  md: "📝",
  txt: "📝",
  csv: "📊",
  json: "📊",
  xml: "📊",
  doc: "📃",
  docx: "📃",
  xls: "📊",
  xlsx: "📊",
  ppt: "📊",
  pptx: "📊",
  exe: "⚙️",
  sh: "⚙️",
  bat: "⚙️",
  html: "🌐",
  css: "🎨",
};

/**
 * Formats a file size in bytes to a human-readable string (B, KB, MB, GB).
 *
 * @param bytes - Size in bytes.
 * @returns Human readable size string.
 */
export function formatSize(bytes: number): string {
  if (bytes == null || isNaN(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/**
 * Formats an ISO-8601 date string into a user-friendly date and time string.
 *
 * @param dateStr - The raw date string.
 * @returns Formatted date representation or fallback placeholder.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Returns an appropriate icon based on the file extension.
 *
 * @param extension - The file extension without dot.
 * @returns An emoji representation for the file type.
 */
export function getFileIcon(extension: string): string {
  const ext = extension.toLowerCase();
  return EXT_ICON_MAP[ext] ?? "📄";
}

/**
 * Classic Windows Explorer details table view component.
 *
 * Renders folders and files in a structured tabular format with sorting,
 * selection checkboxes, double-click navigation/opening, and context menu support.
 *
 * @param props - Component properties for FileTableView.
 * @returns The rendered React table element.
 */
export const FileTableView: React.FC<FileTableViewProps> = ({
  folders,
  files,
  selectedPaths,
  foldersFirst = true,
  onToggleSelect,
  onToggleSelectAll,
  onNavigateFolder,
  onOpenFile,
  onContextMenu,
  emptyMessage,
  onMoveItem,
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  const totalCount = folders.length + files.length;
  const allSelected = totalCount > 0 && selectedPaths.size === totalCount;
  const isIndeterminate = selectedPaths.size > 0 && selectedPaths.size < totalCount;

  // Manage indeterminate checkbox DOM state
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  /**
   * Toggles sorting order or switches active sort column.
   *
   * @param column - The column that was clicked.
   */
  const handleColumnHeaderClick = (column: SortColumn): void => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  /**
   * Sort comparator for comparing two table rows based on active column and direction.
   *
   * @param a - First item to compare.
   * @param b - Second item to compare.
   * @returns Comparison result number (-1, 0, or 1).
   */
  const compareItems = (a: TableRowItem, b: TableRowItem): number => {
    let result = 0;
    switch (sortColumn) {
      case "name":
        result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
        break;
      case "date": {
        const timeA = new Date(a.modified_at).getTime() || 0;
        const timeB = new Date(b.modified_at).getTime() || 0;
        result = timeA - timeB;
        break;
      }
      case "type":
        result = a.type.localeCompare(b.type, undefined, { sensitivity: "base" });
        break;
      case "size":
        result = a.size - b.size;
        break;
    }

    // Tie-breaker: sort alphabetically by name
    if (result === 0) {
      result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    }

    return sortDirection === "asc" ? result : -result;
  };

  /**
   * Memoized sorted list of rows with folders or files positioned first based on `foldersFirst`.
   * When foldersFirst is true, folders appear above files.
   * When foldersFirst is false, files appear above folders.
   */
  const sortedItems = useMemo<TableRowItem[]>(() => {
    const folderItems: TableRowItem[] = folders.map((folder) => ({
      id: folder.path,
      path: folder.path,
      name: folder.name,
      isFolder: true,
      modified_at: folder.modified_at,
      extension: "",
      type: "Folder",
      size: -1,
      formattedSize: "-",
    }));

    const fileItems: TableRowItem[] = files.map((file) => ({
      id: file.path,
      path: file.path,
      name: file.name,
      isFolder: false,
      modified_at: file.modified_at,
      extension: file.extension,
      type: file.extension ? `${file.extension.toUpperCase()} File` : "File",
      size: file.size,
      formattedSize: formatSize(file.size),
    }));

    // Folders sorted among themselves; files sorted among themselves
    folderItems.sort(compareItems);
    fileItems.sort(compareItems);

    return foldersFirst ? [...folderItems, ...fileItems] : [...fileItems, ...folderItems];
  }, [folders, files, foldersFirst, sortColumn, sortDirection]);

  /**
   * Handles row single-click event to toggle selection.
   *
   * @param path - Item file or folder path.
   */
  const handleRowClick = (path: string): void => {
    onToggleSelect(path);
  };

  /**
   * Handles row double-click event to open file or navigate folder.
   *
   * @param item - Clicked table row item.
   */
  const handleRowDoubleClick = (item: TableRowItem): void => {
    if (item.isFolder) {
      onNavigateFolder(item.path);
    } else {
      onOpenFile(item.path);
    }
  };

  /**
   * Handles right-click context menu event on a table row.
   *
   * @param e - Mouse event.
   * @param item - Item that was right-clicked.
   */
  const handleRowContextMenu = (e: React.MouseEvent, item: TableRowItem): void => {
    e.preventDefault();
    onContextMenu(e, item.path, item.isFolder);
  };

  /**
   * Handles context menu button click (three dots).
   *
   * @param e - Mouse event.
   * @param item - Target table item.
   */
  const handleActionButtonClick = (e: React.MouseEvent, item: TableRowItem): void => {
    e.stopPropagation();
    onContextMenu(e, item.path, item.isFolder);
  };

  /**
   * Prevents click events on interactive child elements from bubbling to the row.
   *
   * @param e - Mouse event.
   */
  const handleStopPropagation = (e: React.MouseEvent): void => {
    e.stopPropagation();
  };

  /**
   * Handles toggling selection for a specific row checkbox.
   *
   * @param path - Path of the item to toggle.
   */
  const handleCheckboxToggle = (path: string): void => {
    onToggleSelect(path);
  };

  /**
   * Renders the sort indicator icon if the column is currently active.
   *
   * @param column - Column key to check.
   * @returns Arrow indicator string or null.
   */
  const renderSortIndicator = (column: SortColumn): React.ReactNode => {
    if (sortColumn !== column) return null;
    return (
      <span className="ml-1 text-primary font-bold">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden bg-surface text-on-surface">
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full border-collapse text-left text-xs">
          {/* Table Header */}
          <thead className="sticky top-0 z-10 bg-surface-container border-b border-outline-variant text-on-surface-variant select-none">
            <tr>
              <th className="w-12 px-3 py-3 text-center">
                <input
                  ref={masterCheckboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all files and folders"
                  className="accent-primary w-4 h-4 cursor-pointer rounded"
                />
              </th>

              <th
                onClick={() => handleColumnHeaderClick("name")}
                className="px-3 py-3 font-semibold cursor-pointer hover:text-on-surface transition-colors min-w-[200px]"
              >
                <div className="flex items-center">
                  <span>Name</span>
                  {renderSortIndicator("name")}
                </div>
              </th>

              <th
                onClick={() => handleColumnHeaderClick("date")}
                className="px-3 py-3 font-semibold cursor-pointer hover:text-on-surface transition-colors w-44"
              >
                <div className="flex items-center">
                  <span>Date Modified</span>
                  {renderSortIndicator("date")}
                </div>
              </th>

              <th
                onClick={() => handleColumnHeaderClick("type")}
                className="px-3 py-3 font-semibold cursor-pointer hover:text-on-surface transition-colors w-32"
              >
                <div className="flex items-center">
                  <span>Type</span>
                  {renderSortIndicator("type")}
                </div>
              </th>

              <th
                onClick={() => handleColumnHeaderClick("size")}
                className="px-3 py-3 font-semibold cursor-pointer hover:text-on-surface transition-colors w-28 text-right"
              >
                <div className="flex items-center justify-end">
                  <span>Size</span>
                  {renderSortIndicator("size")}
                </div>
              </th>

              <th className="w-12 px-2 py-3 text-center font-semibold text-on-surface-variant">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-outline-variant/50 font-sans">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-on-surface-variant">
                  {emptyMessage || "This folder is empty."}
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const isSelected = selectedPaths.has(item.path);
                const isOver = dragOverFolder === item.path;

                return (
                  <tr
                    key={item.path}
                    draggable={true}
                    onDragStart={(e) => {
                      const isTargetSelected = selectedPaths.has(item.path);
                      const pathsToDrag =
                        isTargetSelected && selectedPaths.size > 1
                          ? Array.from(selectedPaths)
                          : [item.path];
                      e.dataTransfer.setData("application/foldy-path", item.path);
                      e.dataTransfer.setData("application/foldy-paths", JSON.stringify(pathsToDrag));
                      e.dataTransfer.setData("application/folderly-path", item.path);
                      e.dataTransfer.setData("text/plain", pathsToDrag.join("\n"));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      if (item.isFolder) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverFolder !== item.path) setDragOverFolder(item.path);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        if (dragOverFolder === item.path) setDragOverFolder(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (item.isFolder) {
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
                            if (src && src.toLowerCase() !== item.path.toLowerCase()) {
                              onMoveItem(src, item.path);
                            }
                          }
                        }
                      }
                    }}
                    onClick={() => handleRowClick(item.path)}
                    onDoubleClick={() => handleRowDoubleClick(item)}
                    onContextMenu={(e) => handleRowContextMenu(e, item)}
                    className={`cursor-grab active:cursor-grabbing transition-colors border-y min-h-[44px] ${
                      isOver
                        ? "bg-primary-container border-y-primary text-on-primary-container font-semibold"
                        : isSelected
                        ? "bg-secondary-container/70 border-primary/40 text-on-surface font-medium"
                        : "border-transparent hover:bg-surface-container-high text-on-surface"
                    }`}
                  >
                    <td className="px-3 py-2.5 text-center" onClick={handleStopPropagation}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleCheckboxToggle(item.path)}
                        aria-label={`Select ${item.name}`}
                        className="accent-primary w-4 h-4 cursor-pointer rounded"
                      />
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5 max-w-full">
                        <span className="shrink-0 select-none flex items-center justify-center">
                          {item.isFolder ? (
                            <MacFolderIcon size={20} />
                          ) : (
                            <MacFileIcon extension={item.extension} size={20} />
                          )}
                        </span>
                        <span className="truncate font-medium" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-on-surface-variant truncate whitespace-nowrap">
                      {formatDate(item.modified_at)}
                    </td>

                    <td className="px-3 py-2.5 text-on-surface-variant truncate whitespace-nowrap">
                      {item.type}
                    </td>

                    <td className="px-3 py-2.5 text-on-surface-variant text-right whitespace-nowrap font-mono">
                      {item.formattedSize}
                    </td>

                    <td className="px-2 py-2.5 text-center" onClick={handleStopPropagation}>
                      <button
                        type="button"
                        onClick={(e) => handleActionButtonClick(e, item)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest m3-pressable"
                        title="Actions"
                        aria-label={`Actions for ${item.name}`}
                      >
                        <span className="text-sm font-bold leading-none select-none">⋮</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileTableView;
