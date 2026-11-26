import React from "react";
import { IconAlert, IconCheck, IconFolder } from "./ui";

interface Props {
  message?: string;
  type?: "info" | "success" | "error";
  currentPath?: string | null;
  folderCount?: number;
  fileCount?: number;
}

/**
 * Footer Status Bar displaying current directory / status message and item counts.
 */
const StatusBar: React.FC<Props> = ({
  message,
  type = "info",
  currentPath,
  folderCount = 0,
  fileCount = 0,
}) => {
  const totalItems = folderCount + fileCount;

  return (
    <footer
      role="status"
      aria-live="polite"
      className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 border-t border-outline-variant bg-surface-container-low text-xs text-on-surface-variant z-10"
    >
      {/* Left: Current Directory or Status Message */}
      <div className="flex items-center gap-2 truncate max-w-xl">
        {message && type === "error" ? (
          <IconAlert size={15} className="text-error shrink-0" />
        ) : message && type === "success" ? (
          <IconCheck size={15} className="text-success shrink-0" />
        ) : (
          <IconFolder size={15} className="text-primary shrink-0" />
        )}

        {message && type !== "info" ? (
          <span
            className={`font-medium truncate ${
              type === "error" ? "text-error" : "text-success"
            }`}
          >
            {message}
          </span>
        ) : (
          <span className="truncate">
            Browsing:{" "}
            <span className="text-on-surface font-medium">
              {currentPath || "No folder selected"}
            </span>
          </span>
        )}
      </div>

      {/* Right: Item counts summary */}
      <div className="text-[11px] text-on-surface-variant shrink-0 ml-4 hidden sm:flex items-center gap-1.5">
        <span>{totalItems} items</span>
        <span aria-hidden="true">•</span>
        <span>{folderCount} folders</span>
        <span aria-hidden="true">•</span>
        <span>{fileCount} files</span>
      </div>
    </footer>
  );
};

export default StatusBar;
