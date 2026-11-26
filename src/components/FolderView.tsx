import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  FileEntry,
  FolderEntry,
  SortDirection,
  SortField,
  ViewMode,
} from "../types";
import { getIconGridSize, type IconGridSize } from "../utils/view";
import {
  FileTypeIcon,
  IconArrowDown,
  IconArrowUp,
  IconMoreVert,
} from "./ui";
import {
  EmptyFolderState,
  ItemCheckbox,
  formatDate,
  formatSize,
  getItemInteractionProps,
  getItemSurfaceClass,
  toFolderViewItems,
  type FolderViewItem,
} from "./FileItemShared";

export interface FolderViewProps {
  viewMode: ViewMode;
  folders: FolderEntry[];
  files: FileEntry[];
  selectedPaths: Set<string>;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  onSelectSingle: (path: string) => void;
  onToggleSelect: (path: string) => void;
  onRangeSelect: (targetPath: string) => void;
  onToggleSelectAll: () => void;
  onNavigateFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onNewFolder?: () => void;
  onMoveItem?: (sourcePath: string, destDir: string) => void;
}

interface SubViewProps {
  items: FolderViewItem[];
  selectedPaths: Set<string>;
  dragOverFolder: string | null;
  setDragOverFolder: (path: string | null) => void;
  onSelectSingle: (path: string) => void;
  onToggleSelect: (path: string) => void;
  onRangeSelect: (targetPath: string) => void;
  onNavigateFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
  onMoveItem?: (sourcePath: string, destDir: string) => void;
}

const ICON_GRID_CONFIG: Record<
  IconGridSize,
  {
    minColPx: number;
    iconSize: number;
    aspectClass: string;
    paddingClass: string;
    textClass: string;
    gapClass: string;
  }
> = {
  extra_large: {
    minColPx: 164,
    iconSize: 64,
    aspectClass: "aspect-[5/4]",
    paddingClass: "p-3.5",
    textClass: "text-[13px]",
    gapClass: "gap-3.5",
  },
  large: {
    minColPx: 132,
    iconSize: 48,
    aspectClass: "aspect-[5/4]",
    paddingClass: "p-3",
    textClass: "text-xs",
    gapClass: "gap-3",
  },
  medium: {
    minColPx: 106,
    iconSize: 36,
    aspectClass: "aspect-[5/4]",
    paddingClass: "p-2.5",
    textClass: "text-xs",
    gapClass: "gap-2.5",
  },
  small: {
    minColPx: 88,
    iconSize: 24,
    aspectClass: "aspect-square",
    paddingClass: "p-2",
    textClass: "text-[11px]",
    gapClass: "gap-2",
  },
};

/**
 * Shared icon grid supporting Extra large, Large, Medium, and Small icon sizes.
 */
const IconGridView: React.FC<SubViewProps & { size: IconGridSize }> = ({
  size,
  items,
  selectedPaths,
  dragOverFolder,
  setDragOverFolder,
  onSelectSingle,
  onToggleSelect,
  onRangeSelect,
  onNavigateFolder,
  onOpenFile,
  onContextMenu,
  onMoveItem,
}) => {
  const cfg = ICON_GRID_CONFIG[size];
  const selectionActive = selectedPaths.size > 0;

  return (
    <div className="px-4 sm:px-6 pb-6 pt-2">
      <div
        className={`grid ${cfg.gapClass}`}
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${cfg.minColPx}px, 1fr))`,
        }}
      >
        {items.map((item) => {
          const isSelected = selectedPaths.has(item.path);
          const isDropTarget = item.isFolder && dragOverFolder === item.path;
          const interactionProps = getItemInteractionProps({
            item,
            selectedPaths,
            dragOverFolder,
            setDragOverFolder,
            onSelectSingle,
            onToggleSelect,
            onRangeSelect,
            onNavigateFolder,
            onOpenFile,
            onContextMenu,
            onMoveItem,
          });

          return (
            <div
              key={item.path}
              role="button"
              {...interactionProps}
              title={item.name}
              className={`group relative ${cfg.aspectClass} rounded-m3-lg ${cfg.paddingClass} flex flex-col items-center justify-between cursor-pointer select-none transition-colors m3-pressable ${getItemSurfaceClass(
                isSelected,
                isDropTarget,
                true
              )}`}
            >
              <div className="w-full flex items-start justify-start">
                <ItemCheckbox
                  checked={isSelected}
                  selectionActive={selectionActive}
                  label={`Select ${item.name}`}
                  onToggle={() => onToggleSelect(item.path)}
                />
              </div>

              <div className="flex-1 flex items-center justify-center pointer-events-none">
                <FileTypeIcon
                  isFolder={item.isFolder}
                  extension={item.extension}
                  size={cfg.iconSize}
                />
              </div>

              <p
                className={`w-full text-center ${cfg.textClass} font-medium truncate pointer-events-none`}
              >
                {item.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Compact Windows Explorer List view (multi-column dense rows with icon + name).
 */
const ListView: React.FC<SubViewProps> = ({
  items,
  selectedPaths,
  dragOverFolder,
  setDragOverFolder,
  onSelectSingle,
  onToggleSelect,
  onRangeSelect,
  onNavigateFolder,
  onOpenFile,
  onContextMenu,
  onMoveItem,
}) => {
  const selectionActive = selectedPaths.size > 0;

  return (
    <div className="px-4 sm:px-6 pb-6 pt-2">
      <div
        role="list"
        className="grid gap-1"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
      >
        {items.map((item) => {
          const isSelected = selectedPaths.has(item.path);
          const isDropTarget = item.isFolder && dragOverFolder === item.path;
          const interactionProps = getItemInteractionProps({
            item,
            selectedPaths,
            dragOverFolder,
            setDragOverFolder,
            onSelectSingle,
            onToggleSelect,
            onRangeSelect,
            onNavigateFolder,
            onOpenFile,
            onContextMenu,
            onMoveItem,
          });

          return (
            <div
              key={item.path}
              role="listitem"
              {...interactionProps}
              title={item.name}
              className={`group flex items-center gap-2 px-2.5 h-9 rounded-m3-sm cursor-pointer select-none transition-colors ${getItemSurfaceClass(
                isSelected,
                isDropTarget
              )}`}
            >
              <ItemCheckbox
                checked={isSelected}
                selectionActive={selectionActive}
                label={`Select ${item.name}`}
                onToggle={() => onToggleSelect(item.path)}
              />
              <FileTypeIcon
                isFolder={item.isFolder}
                extension={item.extension}
                size={18}
              />
              <span className="flex-1 text-[13px] font-medium truncate">
                {item.name}
              </span>
              <button
                type="button"
                aria-label={`Actions for ${item.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onContextMenu(e, item.path, item.isFolder);
                }}
                className="inline-flex items-center justify-center w-6 h-6 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
              >
                <IconMoreVert size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

type DetailsColumnKey = "name" | "date_modified" | "date_created" | "type" | "size";

interface DetailsColumnDef {
  key: DetailsColumnKey;
  label: string;
  minWidth: number;
  defaultWidth: number;
  alignRight?: boolean;
}

const DETAILS_COLUMNS: ReadonlyArray<DetailsColumnDef> = [
  { key: "name", label: "Name", minWidth: 140, defaultWidth: 280 },
  { key: "date_modified", label: "Date modified", minWidth: 110, defaultWidth: 150 },
  { key: "date_created", label: "Date created", minWidth: 110, defaultWidth: 150 },
  { key: "type", label: "Type", minWidth: 80, defaultWidth: 116 },
  { key: "size", label: "Size", minWidth: 72, defaultWidth: 96, alignRight: true },
];

const DETAILS_COL_WIDTHS_STORAGE_KEY = "foldy_details_col_widths";

function loadDetailsColumnWidths(): Record<DetailsColumnKey, number> {
  const defaults: Record<DetailsColumnKey, number> = {
    name: 280,
    date_modified: 150,
    date_created: 150,
    type: 116,
    size: 96,
  };
  try {
    const raw = localStorage.getItem(DETAILS_COL_WIDTHS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<DetailsColumnKey, number>>;
    for (const col of DETAILS_COLUMNS) {
      const val = parsed[col.key];
      if (typeof val === "number" && Number.isFinite(val)) {
        defaults[col.key] = Math.max(col.minWidth, Math.min(640, val));
      }
    }
  } catch {
    // Ignore storage errors
  }
  return defaults;
}

/**
 * Windows Explorer Details view: resizable columns, sortable headers wired to
 * existing sort state, and shared item selection/drag/context-menu handlers.
 */
const DetailsView: React.FC<
  SubViewProps & {
    sortField: SortField;
    sortDirection: SortDirection;
    onSortChange: (field: SortField) => void;
    onSortDirectionChange: (direction: SortDirection) => void;
    onToggleSelectAll: () => void;
  }
> = ({
  items,
  selectedPaths,
  dragOverFolder,
  setDragOverFolder,
  sortField,
  sortDirection,
  onSortChange,
  onSortDirectionChange,
  onSelectSingle,
  onToggleSelect,
  onRangeSelect,
  onToggleSelectAll,
  onNavigateFolder,
  onOpenFile,
  onContextMenu,
  onMoveItem,
}) => {
  const [colWidths, setColWidths] = useState<Record<DetailsColumnKey, number>>(
    loadDetailsColumnWidths
  );
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  const totalCount = items.length;
  const selectionActive = selectedPaths.size > 0;
  const allSelected = totalCount > 0 && selectedPaths.size === totalCount;
  const isIndeterminate = selectedPaths.size > 0 && selectedPaths.size < totalCount;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  useEffect(() => {
    try {
      localStorage.setItem(DETAILS_COL_WIDTHS_STORAGE_KEY, JSON.stringify(colWidths));
    } catch {
      // Ignore storage errors
    }
  }, [colWidths]);

  const handleHeaderClick = (field: DetailsColumnKey) => {
    if (sortField === field) {
      onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSortChange(field);
      onSortDirectionChange("asc");
    }
  };

  const handleResizeStart = (
    e: React.MouseEvent,
    key: DetailsColumnKey,
    minWidth: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[key];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(
        minWidth,
        Math.min(640, startWidth + (moveEvent.clientX - startX))
      );
      setColWidths((prev) => ({ ...prev, [key]: nextWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const gridTemplateColumns = `28px ${colWidths.name}px ${colWidths.date_modified}px ${colWidths.date_created}px ${colWidths.type}px ${colWidths.size}px 36px`;

  return (
    <div className="px-4 sm:px-6 pb-6 overflow-x-auto">
      <div className="min-w-max">
        {/* Sortable & Resizable Header */}
        <div
          className="grid items-center gap-2 px-3 h-9 text-[11px] font-medium text-on-surface-variant select-none border-b border-outline-variant/40"
          style={{ gridTemplateColumns }}
        >
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

          {DETAILS_COLUMNS.map((col) => {
            const isActive = sortField === col.key;
            return (
              <div
                key={col.key}
                className="relative flex items-center h-full min-w-0 pr-2"
              >
                <button
                  type="button"
                  onClick={() => handleHeaderClick(col.key)}
                  className={`flex items-center gap-1 w-full h-7 px-1.5 rounded-m3-xs hover:bg-surface-container-high hover:text-on-surface transition-colors truncate ${
                    col.alignRight ? "justify-end" : "justify-start"
                  } ${isActive ? "text-on-surface font-semibold" : ""}`}
                >
                  <span className="truncate">{col.label}</span>
                  {isActive &&
                    (sortDirection === "asc" ? (
                      <IconArrowUp size={12} className="shrink-0" />
                    ) : (
                      <IconArrowDown size={12} className="shrink-0" />
                    ))}
                </button>
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize ${col.label} column`}
                  onMouseDown={(e) => handleResizeStart(e, col.key, col.minWidth)}
                  className="absolute right-0 top-1.5 bottom-1.5 w-1.5 cursor-col-resize rounded-full hover:bg-primary/50 transition-colors"
                />
              </div>
            );
          })}

          <span />
        </div>

        {/* Rows */}
        <div role="list" className="space-y-0.5 pt-1">
          {items.map((item) => {
            const isSelected = selectedPaths.has(item.path);
            const isDropTarget = item.isFolder && dragOverFolder === item.path;
            const interactionProps = getItemInteractionProps({
              item,
              selectedPaths,
              dragOverFolder,
              setDragOverFolder,
              onSelectSingle,
              onToggleSelect,
              onRangeSelect,
              onNavigateFolder,
              onOpenFile,
              onContextMenu,
              onMoveItem,
            });

            return (
              <div
                key={item.path}
                role="listitem"
                {...interactionProps}
                className={`group grid items-center gap-2 px-3 h-10 rounded-m3-sm cursor-pointer select-none transition-colors ${getItemSurfaceClass(
                  isSelected,
                  isDropTarget
                )}`}
                style={{ gridTemplateColumns }}
              >
                <div className="flex items-center justify-center">
                  <ItemCheckbox
                    checked={isSelected}
                    selectionActive={selectionActive}
                    label={`Select ${item.name}`}
                    onToggle={() => onToggleSelect(item.path)}
                  />
                </div>

                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <FileTypeIcon
                    isFolder={item.isFolder}
                    extension={item.extension}
                    size={18}
                  />
                  <span className="text-[13px] font-medium truncate">
                    {item.name}
                  </span>
                </div>

                <span className="text-xs text-on-surface-variant truncate pr-2">
                  {formatDate(item.modified_at)}
                </span>

                <span className="text-xs text-on-surface-variant truncate pr-2">
                  {formatDate(item.created_at)}
                </span>

                <span className="text-xs text-on-surface-variant truncate pr-2">
                  {item.typeLabel}
                </span>

                <span className="text-xs text-on-surface-variant text-right tabular-nums pr-2">
                  {item.isFolder ? "—" : formatSize(item.size)}
                </span>

                <button
                  type="button"
                  aria-label={`Actions for ${item.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onContextMenu(e, item.path, item.isFolder);
                  }}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <IconMoreVert size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Tiles view: icon + name + type and size on two lines.
 */
const TilesView: React.FC<SubViewProps> = ({
  items,
  selectedPaths,
  dragOverFolder,
  setDragOverFolder,
  onSelectSingle,
  onToggleSelect,
  onRangeSelect,
  onNavigateFolder,
  onOpenFile,
  onContextMenu,
  onMoveItem,
}) => {
  const selectionActive = selectedPaths.size > 0;

  return (
    <div className="px-4 sm:px-6 pb-6 pt-2">
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
      >
        {items.map((item) => {
          const isSelected = selectedPaths.has(item.path);
          const isDropTarget = item.isFolder && dragOverFolder === item.path;
          const interactionProps = getItemInteractionProps({
            item,
            selectedPaths,
            dragOverFolder,
            setDragOverFolder,
            onSelectSingle,
            onToggleSelect,
            onRangeSelect,
            onNavigateFolder,
            onOpenFile,
            onContextMenu,
            onMoveItem,
          });
          const subtitle = item.isFolder
            ? item.typeLabel
            : `${item.typeLabel} · ${formatSize(item.size)}`;

          return (
            <div
              key={item.path}
              role="button"
              {...interactionProps}
              title={item.name}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-m3-md cursor-pointer select-none transition-colors m3-pressable ${getItemSurfaceClass(
                isSelected,
                isDropTarget,
                true
              )}`}
            >
              <ItemCheckbox
                checked={isSelected}
                selectionActive={selectionActive}
                label={`Select ${item.name}`}
                onToggle={() => onToggleSelect(item.path)}
              />
              <FileTypeIcon
                isFolder={item.isFolder}
                extension={item.extension}
                size={36}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{item.name}</p>
                <p className="text-[11px] text-on-surface-variant truncate">
                  {subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Content view: full-width rows with icon, name, and metadata summary.
 */
const ContentView: React.FC<SubViewProps> = ({
  items,
  selectedPaths,
  dragOverFolder,
  setDragOverFolder,
  onSelectSingle,
  onToggleSelect,
  onRangeSelect,
  onNavigateFolder,
  onOpenFile,
  onContextMenu,
  onMoveItem,
}) => {
  const selectionActive = selectedPaths.size > 0;

  return (
    <div className="px-4 sm:px-6 pb-6 pt-2">
      <div role="list" className="space-y-1.5">
        {items.map((item) => {
          const isSelected = selectedPaths.has(item.path);
          const isDropTarget = item.isFolder && dragOverFolder === item.path;
          const interactionProps = getItemInteractionProps({
            item,
            selectedPaths,
            dragOverFolder,
            setDragOverFolder,
            onSelectSingle,
            onToggleSelect,
            onRangeSelect,
            onNavigateFolder,
            onOpenFile,
            onContextMenu,
            onMoveItem,
          });
          const summary = item.isFolder
            ? `${item.typeLabel} · Modified ${formatDate(item.modified_at)} · Created ${formatDate(item.created_at)}`
            : `${item.typeLabel} · ${formatSize(item.size)} · Modified ${formatDate(item.modified_at)}`;

          return (
            <div
              key={item.path}
              role="listitem"
              {...interactionProps}
              className={`group flex items-center gap-3 px-3 py-2.5 min-h-[60px] rounded-m3-md cursor-pointer select-none transition-colors ${getItemSurfaceClass(
                isSelected,
                isDropTarget,
                true
              )}`}
            >
              <ItemCheckbox
                checked={isSelected}
                selectionActive={selectionActive}
                label={`Select ${item.name}`}
                onToggle={() => onToggleSelect(item.path)}
              />
              <FileTypeIcon
                isFolder={item.isFolder}
                extension={item.extension}
                size={32}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{item.name}</p>
                <p className="text-[11px] text-on-surface-variant truncate">
                  {summary}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Actions for ${item.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onContextMenu(e, item.path, item.isFolder);
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
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

/**
 * Unified folder contents view switching cleanly across all 8 Windows Explorer layouts.
 */
export const FolderView: React.FC<FolderViewProps> = ({
  viewMode,
  folders,
  files,
  selectedPaths,
  sortField,
  sortDirection,
  onSortChange,
  onSortDirectionChange,
  onSelectSingle,
  onToggleSelect,
  onRangeSelect,
  onToggleSelectAll,
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

  const items = useMemo(
    () => toFolderViewItems(folders, files),
    [folders, files]
  );

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

  const sharedProps: SubViewProps = {
    items,
    selectedPaths,
    dragOverFolder,
    setDragOverFolder,
    onSelectSingle,
    onToggleSelect,
    onRangeSelect,
    onNavigateFolder,
    onOpenFile,
    onContextMenu,
    onMoveItem,
  };

  const iconSize = getIconGridSize(viewMode);

  return (
    <div key={viewMode} className="animate-m3-view-switch">
      {iconSize ? (
        <IconGridView size={iconSize} {...sharedProps} />
      ) : viewMode === "list" ? (
        <ListView {...sharedProps} />
      ) : viewMode === "details" ? (
        <DetailsView
          {...sharedProps}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
          onSortDirectionChange={onSortDirectionChange}
          onToggleSelectAll={onToggleSelectAll}
        />
      ) : viewMode === "tiles" ? (
        <TilesView {...sharedProps} />
      ) : (
        <ContentView {...sharedProps} />
      )}
    </div>
  );
};

export default FolderView;
