import React from "react";

interface Props {
  message?: string;
  type?: "info" | "success" | "error";
  currentPath?: string | null;
  folderCount?: number;
  fileCount?: number;
}

/**
 * Modern Footer Status Bar matching the mockup:
 * - Left: 📁 Browsing: C:\Users\ryan\Downloads (or status message)
 * - Right: 30 items • 22 folders • 8 files
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
    <footer className="shrink-0 flex items-center justify-between px-6 py-2 border-t border-neutral-800/30 text-xs text-muted-color z-10 transition-colors">
      {/* Left: Current Directory or Status Message */}
      <div className="flex items-center gap-2 truncate max-w-xl">
        <span className="text-[#ff2d87]">📁</span>
        {message && type !== "info" ? (
          <span
            className={`font-medium truncate ${
              type === "error" ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {message}
          </span>
        ) : (
          <span className="truncate">
            Browsing: <span className="text-primary-color font-medium">{currentPath || "No folder selected"}</span>
          </span>
        )}
      </div>

      {/* Right: Item counts summary */}
      <div className="text-[11px] text-muted-color shrink-0 ml-4">
        <span>{totalItems} items</span>
        <span className="mx-1.5">•</span>
        <span>{folderCount} folders</span>
        <span className="mx-1.5">•</span>
        <span>{fileCount} files</span>
      </div>
    </footer>
  );
};

export default StatusBar;
