import React from "react";
import { MacFileIcon, MacFolderIcon } from "./MacIcons";
import { formatSize } from "./FileItemShared";
import { formatFileType } from "../utils/view";
import type { PreviewPaneItem } from "./FilePreviewPane";
import {
  Button,
  IconClose,
  IconExternalLink,
  IconEye,
  IconFolder,
  IconList,
} from "./ui";

export interface DetailsPaneProps {
  /** Whether the Details pane is open. */
  isOpen: boolean;
  /** Callback to close/hide the Details pane. */
  onClose: () => void;
  /** Currently selected items (empty array if none). */
  selectedItems: PreviewPaneItem[];
  /** Current directory path for empty-selection folder summary. */
  currentPath: string | null;
  /** Visible folder count in current directory. */
  folderCount: number;
  /** Visible file count in current directory. */
  fileCount: number;
  /** Combined size in bytes of visible files in current directory. */
  totalFolderBytes: number;
  /** Callback to open a file in the default OS app. */
  onOpenFile?: (path: string) => void;
  /** Callback to navigate into a folder. */
  onNavigateFolder?: (path: string) => void;
  /** Callback to open Quick Look for a single item. */
  onOpenQuickLook?: (path: string, isFolder: boolean) => void;
}

function formatDateTime(iso?: string): string {
  if (!iso || iso === "unknown") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.split("T")[0] || "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getExtension(item: PreviewPaneItem): string {
  if (item.extension) return item.extension.replace(/^\./, "").toLowerCase();
  const idx = item.name.lastIndexOf(".");
  if (idx > 0 && idx < item.name.length - 1) {
    return item.name.slice(idx + 1).toLowerCase();
  }
  return "";
}

/**
 * Right-side Details pane showing metadata for the selected item(s) or
 * current folder summary when nothing is selected.
 * Uses M3 tonal surfaces with zero outline clutter and collapses to an overlay on small widths.
 */
export const DetailsPane: React.FC<DetailsPaneProps> = ({
  isOpen,
  onClose,
  selectedItems,
  currentPath,
  folderCount,
  fileCount,
  totalFolderBytes,
  onOpenFile,
  onNavigateFolder,
  onOpenQuickLook,
}) => {
  if (!isOpen) return null;

  const single = selectedItems.length === 1 ? selectedItems[0] : null;
  const multiple = selectedItems.length > 1;
  const currentFolderName =
    currentPath === "recents"
      ? "Recent Files"
      : currentPath
      ? currentPath.split(/[\\/]/).filter(Boolean).pop() || currentPath
      : "Folder";

  const selectedFolderCount = selectedItems.filter((i) => i.isFolder).length;
  const selectedFileCount = selectedItems.length - selectedFolderCount;
  const selectedTotalBytes = selectedItems.reduce(
    (sum, item) => sum + (!item.isFolder && item.size != null && item.size >= 0 ? item.size : 0),
    0
  );

  const uniqueTypes = Array.from(
    new Set(
      selectedItems.map((i) => formatFileType(i.isFolder, getExtension(i)))
    )
  );
  const multiTypeLabel =
    uniqueTypes.length === 1 ? uniqueTypes[0] : `${uniqueTypes.length} types`;

  return (
    <>
      {/* Small-width overlay scrim */}
      <div
        className="lg:hidden absolute inset-0 bg-scrim z-20"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Details pane"
        className="absolute inset-y-0 right-0 z-30 w-full max-w-sm lg:static lg:w-72 xl:w-80 lg:max-w-none shrink-0 flex flex-col bg-surface-container-low text-on-surface shadow-m3-3 lg:shadow-none overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-surface-container flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <IconList size={16} className="text-primary shrink-0" />
            <h2 className="text-xs font-semibold text-on-surface tracking-wide uppercase">
              Details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close details pane"
            aria-label="Close details pane"
            className="inline-flex items-center justify-center w-8 h-8 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest m3-pressable"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {!single && !multiple && (
            <>
              <div className="rounded-m3-lg bg-surface-container p-5 flex flex-col items-center text-center gap-2.5">
                <MacFolderIcon size={44} />
                <p className="text-sm font-semibold text-on-surface break-words max-w-full">
                  {currentFolderName}
                </p>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-m3-full bg-secondary-container text-on-secondary-container">
                  Current folder
                </span>
              </div>

              <dl className="rounded-m3-md bg-surface-container p-3.5 grid grid-cols-[88px_1fr] gap-y-2.5 gap-x-2 text-xs">
                <dt className="text-on-surface-variant">Folders</dt>
                <dd className="text-on-surface font-medium tabular-nums">{folderCount}</dd>

                <dt className="text-on-surface-variant">Files</dt>
                <dd className="text-on-surface font-medium tabular-nums">{fileCount}</dd>

                <dt className="text-on-surface-variant">Total size</dt>
                <dd className="text-on-surface tabular-nums">
                  {fileCount > 0 ? formatSize(totalFolderBytes) : "—"}
                </dd>

                {currentPath && (
                  <>
                    <dt className="text-on-surface-variant">Location</dt>
                    <dd className="text-on-surface font-mono text-[11px] break-all">
                      {currentPath}
                    </dd>
                  </>
                )}
              </dl>
            </>
          )}

          {single && (
            <>
              <div className="rounded-m3-lg bg-surface-container p-5 flex flex-col items-center text-center gap-2.5">
                {single.isFolder ? (
                  <MacFolderIcon size={48} />
                ) : (
                  <MacFileIcon extension={getExtension(single)} size={48} />
                )}
                <p className="text-sm font-semibold text-on-surface break-words max-w-full">
                  {single.name}
                </p>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-m3-full bg-secondary-container text-on-secondary-container">
                  {formatFileType(single.isFolder, getExtension(single))}
                </span>
              </div>

              <dl className="rounded-m3-md bg-surface-container p-3.5 grid grid-cols-[88px_1fr] gap-y-2.5 gap-x-2 text-xs">
                <dt className="text-on-surface-variant">Type</dt>
                <dd className="text-on-surface font-medium truncate">
                  {formatFileType(single.isFolder, getExtension(single))}
                </dd>

                <dt className="text-on-surface-variant">Size</dt>
                <dd className="text-on-surface tabular-nums">
                  {single.isFolder
                    ? "—"
                    : single.size != null && single.size >= 0
                    ? `${formatSize(single.size)} (${single.size.toLocaleString()} B)`
                    : "—"}
                </dd>

                <dt className="text-on-surface-variant">Modified</dt>
                <dd className="text-on-surface">{formatDateTime(single.modified_at)}</dd>

                <dt className="text-on-surface-variant">Created</dt>
                <dd className="text-on-surface">{formatDateTime(single.created_at)}</dd>

                {!single.isFolder && getExtension(single) && (
                  <>
                    <dt className="text-on-surface-variant">Extension</dt>
                    <dd className="text-on-surface font-mono uppercase">
                      .{getExtension(single)}
                    </dd>
                  </>
                )}

                <dt className="text-on-surface-variant">Location</dt>
                <dd className="text-on-surface font-mono text-[11px] break-all">
                  {single.path}
                </dd>
              </dl>

              <div className="flex flex-col gap-2">
                {single.isFolder && onNavigateFolder && (
                  <Button
                    variant="tonal"
                    size="sm"
                    onClick={() => onNavigateFolder(single.path)}
                    leadingIcon={<IconFolder size={14} />}
                  >
                    Open folder
                  </Button>
                )}
                {!single.isFolder && onOpenFile && (
                  <Button
                    variant="tonal"
                    size="sm"
                    onClick={() => onOpenFile(single.path)}
                    leadingIcon={<IconExternalLink size={14} />}
                  >
                    Open in default app
                  </Button>
                )}
                {onOpenQuickLook && (
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => onOpenQuickLook(single.path, single.isFolder)}
                    leadingIcon={<IconEye size={14} />}
                  >
                    Quick Look (Space)
                  </Button>
                )}
              </div>
            </>
          )}

          {multiple && (
            <>
              <div className="rounded-m3-lg bg-surface-container p-4 space-y-1">
                <p className="text-sm font-semibold text-on-surface">
                  {selectedItems.length} items selected
                </p>
                <p className="text-xs text-on-surface-variant">
                  {[
                    selectedFolderCount > 0
                      ? `${selectedFolderCount} ${selectedFolderCount === 1 ? "folder" : "folders"}`
                      : null,
                    selectedFileCount > 0
                      ? `${selectedFileCount} ${selectedFileCount === 1 ? "file" : "files"}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>

              <dl className="rounded-m3-md bg-surface-container p-3.5 grid grid-cols-[88px_1fr] gap-y-2.5 gap-x-2 text-xs">
                <dt className="text-on-surface-variant">Types</dt>
                <dd className="text-on-surface font-medium truncate">{multiTypeLabel}</dd>

                <dt className="text-on-surface-variant">Total size</dt>
                <dd className="text-on-surface tabular-nums">
                  {selectedFileCount > 0
                    ? `${formatSize(selectedTotalBytes)} (${selectedTotalBytes.toLocaleString()} B)`
                    : "—"}
                </dd>
              </dl>

              <div className="rounded-m3-md bg-surface-container p-3 space-y-1.5">
                <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">
                  Selected items
                </p>
                <ul className="space-y-1">
                  {selectedItems.slice(0, 12).map((item) => (
                    <li
                      key={item.path}
                      className="flex items-center gap-2 text-xs text-on-surface truncate"
                      title={item.name}
                    >
                      {item.isFolder ? (
                        <MacFolderIcon size={15} />
                      ) : (
                        <MacFileIcon extension={getExtension(item)} size={15} />
                      )}
                      <span className="truncate flex-1">{item.name}</span>
                      {!item.isFolder && item.size != null && (
                        <span className="text-[11px] text-on-surface-variant tabular-nums shrink-0">
                          {formatSize(item.size)}
                        </span>
                      )}
                    </li>
                  ))}
                  {selectedItems.length > 12 && (
                    <li className="text-[11px] text-on-surface-variant pt-1">
                      +{selectedItems.length - 12} more item(s)
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default DetailsPane;
