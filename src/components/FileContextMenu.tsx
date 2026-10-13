import React, { useEffect, useRef, useState } from "react";

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
}

/**
 * Floating context menu component for file and folder actions.
 *
 * Appears at specified screen coordinates with dark theme styling.
 * Automatically closes on outside click or Escape key press.
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
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x, y });

  // Calculate boundary-constrained position to keep the menu inside the viewport
  useEffect(() => {
    if (!isOpen) return;

    const estimatedWidth = 220;
    const estimatedHeight = 180;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let posX = x;
    let posY = y;

    if (posX + estimatedWidth > viewportWidth) {
      posX = Math.max(8, viewportWidth - estimatedWidth - 8);
    }
    if (posY + estimatedHeight > viewportHeight) {
      posY = Math.max(8, viewportHeight - estimatedHeight - 8);
    }

    setPosition({ x: posX, y: posY });
  }, [isOpen, x, y]);

  // Handle outside clicks and keyboard escape dismissal
  useEffect(() => {
    if (!isOpen) return;

    /**
     * Closes the context menu if a mouse click occurs outside of the menu container.
     * @param event - The mouse event triggered on the document.
     */
    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    /**
     * Closes the context menu when the Escape key is pressed.
     * @param event - The keyboard event triggered on the document.
     */
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

  /**
   * Handles opening the target file or directory.
   */
  const handleOpenAction = () => {
    onOpen(targetPath);
    onClose();
  };

  /**
   * Handles opening the item's parent directory in Windows Explorer.
   */
  const handleShowInFileManagerAction = () => {
    onShowInFileManager(targetPath);
    onClose();
  };

  /**
   * Copies the full target path to the system clipboard.
   */
  const handleCopyPathAction = async () => {
    try {
      await navigator.clipboard.writeText(targetPath);
    } catch (err) {
      console.error("Failed to copy path to clipboard:", err);
    }
    onClose();
  };

  /**
   * Handles initiating deletion for the target item.
   */
  const handleDeleteAction = () => {
    onDelete(targetPath);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      className="fixed z-50 min-w-[210px] bg-neutral-900 border border-neutral-700 shadow-2xl rounded-xl py-1.5 px-1 text-sm text-neutral-200 select-none animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Open action */}
      <button
        type="button"
        role="menuitem"
        onClick={handleOpenAction}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors duration-150 cursor-pointer"
      >
        <svg
          className="w-4 h-4 text-neutral-400 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {isFolder ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          )}
        </svg>
        <span className="font-medium truncate">{isFolder ? "Open Folder" : "Open"}</span>
      </button>

      {/* Open in New Tab (Folders only) */}
      {isFolder && onOpenInNewTab && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onOpenInNewTab(targetPath);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors duration-150 cursor-pointer"
        >
          <span className="w-4 h-4 text-neutral-400 shrink-0 text-center text-xs">⊞</span>
          <span className="font-medium truncate">Open in New Tab</span>
        </button>
      )}

      {/* Pin to Sidebar (Folders only) */}
      {isFolder && onPinFolder && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onPinFolder(targetPath);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors duration-150 cursor-pointer"
        >
          <span className="w-4 h-4 text-neutral-400 shrink-0 text-center text-xs">📌</span>
          <span className="font-medium truncate">Pin to Sidebar</span>
        </button>
      )}

      {/* Show in Windows Explorer */}
      <button
        type="button"
        role="menuitem"
        onClick={handleShowInFileManagerAction}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors duration-150 cursor-pointer"
      >
        <svg
          className="w-4 h-4 text-neutral-400 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 11h.01M16 11h.01M8 11h.01"
          />
        </svg>
        <span className="font-medium truncate">Show in Windows Explorer</span>
      </button>

      {/* Copy Path to clipboard */}
      <button
        type="button"
        role="menuitem"
        onClick={handleCopyPathAction}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors duration-150 cursor-pointer"
      >
        <svg
          className="w-4 h-4 text-neutral-400 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
          />
        </svg>
        <span className="font-medium truncate">Copy Path</span>
      </button>

      {/* Divider */}
      <div className="my-1 border-t border-neutral-800" role="separator" />

      {/* Delete */}
      <button
        type="button"
        role="menuitem"
        onClick={handleDeleteAction}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-red-400 hover:bg-red-950/60 hover:text-red-300 transition-colors duration-150 cursor-pointer"
      >
        <svg
          className="w-4 h-4 text-red-400 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <span className="font-medium truncate">Delete</span>
      </button>
    </div>
  );
};

export default FileContextMenu;
