import React, { useEffect, useRef, useState } from "react";
import {
  IconExternalLink,
  IconEye,
  IconFile,
  IconFolder,
  IconPin,
  IconPlus,
  IconTrash,
} from "./ui";

/**
 * Props accepted by the {@link FileContextMenu} component.
 */
export interface FileContextMenuProps {
  /** Whether the context menu is currently visible. */
  isOpen: boolean;
  /** Horizontal screen coordinate in pixels where the menu was triggered. */
  x: number;
  /** Vertical screen coordinate in pixels where the menu was triggered. */
  y: number;
  /** Absolute file system path of the target file or folder, or null if unselected. */
  targetPath: string | null;
  /** True if the target item is a directory, false if it is a regular file. */
  isFolder: boolean;
  /** Callback invoked when the menu requests to be closed. */
  onClose: () => void;
  /** Callback invoked to open the target file or navigate into the folder. */
  onOpen: (path: string) => void;
  /** Callback invoked to reveal the target item in Windows Explorer. */
  onShowInFileManager: (path: string) => void;
  /** Callback invoked to delete the target item. */
  onDelete: (path: string) => void;
  /** Callback invoked to open the folder in a new tab. */
  onOpenInNewTab?: (path: string) => void;
  /** Callback invoked to pin the folder to the sidebar. */
  onPinFolder?: (path: string) => void;
  /** Callback invoked to launch the Quick Look preview for the target item. */
  onPreview?: (path: string, isFolder: boolean) => void;
}

/**
 * Material 3 floating context menu for file and folder actions.
 * Appears at pointer coordinates with origin-aware entrance and Escape/outside-click dismissal.
 */
export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  isOpen,
  x,
  y,
  targetPath,
  isFolder,
  onClose,
  onOpen,
  onShowInFileManager,
  onDelete,
  onOpenInNewTab,
  onPinFolder,
  onPreview,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number; origin: string }>({
    x,
    y,
    origin: "top left",
  });

  useEffect(() => {
    if (!isOpen) return;

    const estimatedWidth = 236;
    const estimatedHeight = 260;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const flipX = x + estimatedWidth > viewportWidth;
    const flipY = y + estimatedHeight > viewportHeight;

    const posX = flipX ? Math.max(8, viewportWidth - estimatedWidth - 8) : x;
    const posY = flipY ? Math.max(8, viewportHeight - estimatedHeight - 8) : y;
    const origin = `${flipY ? "bottom" : "top"} ${flipX ? "right" : "left"}`;

    setPosition({ x: posX, y: posY, origin });
  }, [isOpen, x, y]);

  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !targetPath) {
    return null;
  }

  const handleCopyPathAction = async () => {
    try {
      await navigator.clipboard.writeText(targetPath);
    } catch (err) {
      console.error("Failed to copy path to clipboard:", err);
    }
    onClose();
  };

  const itemClass =
    "w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-m3-sm text-left text-sm text-on-surface hover:bg-surface-container-highest m3-pressable cursor-pointer";

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="File actions"
      aria-orientation="vertical"
      className="fixed z-50 min-w-[232px] bg-surface-container-high border border-outline-variant shadow-m3-3 rounded-m3-md py-1.5 px-1.5 text-on-surface select-none animate-m3-popover"
      style={
        {
          left: `${position.x}px`,
          top: `${position.y}px`,
          "--transform-origin": position.origin,
        } as React.CSSProperties
      }
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onOpen(targetPath);
          onClose();
        }}
        className={itemClass}
      >
        {isFolder ? (
          <IconFolder size={16} className="text-on-surface-variant shrink-0" />
        ) : (
          <IconExternalLink size={16} className="text-on-surface-variant shrink-0" />
        )}
        <span className="font-medium truncate">
          {isFolder ? "Open Folder" : "Open"}
        </span>
      </button>

      {onPreview && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onPreview(targetPath, isFolder);
            onClose();
          }}
          className={`${itemClass} justify-between`}
        >
          <span className="flex items-center gap-3 min-w-0">
            <IconEye size={16} className="text-on-surface-variant shrink-0" />
            <span className="font-medium truncate">Quick Look Preview</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] rounded-m3-xs bg-surface-container text-on-surface-variant font-mono border border-outline-variant">
            P
          </kbd>
        </button>
      )}

      {isFolder && onOpenInNewTab && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onOpenInNewTab(targetPath);
            onClose();
          }}
          className={itemClass}
        >
          <IconPlus size={16} className="text-on-surface-variant shrink-0" />
          <span className="font-medium truncate">Open in New Tab</span>
        </button>
      )}

      {isFolder && onPinFolder && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onPinFolder(targetPath);
            onClose();
          }}
          className={itemClass}
        >
          <IconPin size={16} className="text-on-surface-variant shrink-0" />
          <span className="font-medium truncate">Pin to Sidebar</span>
        </button>
      )}

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onShowInFileManager(targetPath);
          onClose();
        }}
        className={itemClass}
      >
        <IconFolder size={16} className="text-on-surface-variant shrink-0" />
        <span className="font-medium truncate">Show in File Manager</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={handleCopyPathAction}
        className={itemClass}
      >
        <IconFile size={16} className="text-on-surface-variant shrink-0" />
        <span className="font-medium truncate">Copy Path</span>
      </button>

      <div className="my-1.5 border-t border-outline-variant" role="separator" />

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onDelete(targetPath);
          onClose();
        }}
        className="w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-m3-sm text-left text-sm text-error hover:bg-error-container/50 m3-pressable cursor-pointer"
      >
        <IconTrash size={16} className="shrink-0" />
        <span className="font-medium truncate">Delete</span>
      </button>
    </div>
  );
};

export default FileContextMenu;
