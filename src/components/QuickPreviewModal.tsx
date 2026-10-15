import React, { useState, useEffect, useCallback, useMemo } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { MacFileIcon, MacFolderIcon } from "./MacIcons";
import type { DirContents, FileEntry } from "../types";

/**
 * Item metadata representation passed to the QuickPreviewModal.
 */
export interface QuickPreviewItem {
  /** Full filesystem path of the item. */
  path: string;
  /** Display name of the file or folder. */
  name: string;
  /** Whether the item is a folder / directory. */
  isFolder?: boolean;
  /** File size in bytes (if known). */
  size?: number;
  /** File extension without leading dot (if known). */
  extension?: string;
  /** Last modification timestamp string (ISO-8601 or formatted). */
  modified_at?: string;
}

/**
 * Props accepted by the {@link QuickPreviewModal} component.
 */
export interface QuickPreviewModalProps {
  /** Whether the quick preview modal is currently visible. */
  isOpen: boolean;
  /** Callback invoked when closing the preview modal. */
  onClose: () => void;
  /** Current selected file or directory item to preview. */
  item: QuickPreviewItem | null;
  /** Callback to navigate into a folder inside Foldy. */
  onNavigateFolder?: (path: string) => void;
  /** Callback to open/launch a file in the default OS application. */
  onOpenFile?: (path: string) => void;
  /** Callback to cycle to the next file or directory in the list. */
  onNextItem?: () => void;
  /** Callback to cycle to the previous file or directory in the list. */
  onPrevItem?: () => void;
  /** Whether there is a subsequent item available to cycle to. */
  hasNext?: boolean;
  /** Whether there is a preceding item available to cycle to. */
  hasPrev?: boolean;
}

/** Supported image file extensions for direct visual preview. */
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"]);

/** Supported video file extensions for HTML5 video playback. */
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "mkv", "avi"]);

/** Supported audio file extensions for HTML5 audio playback. */
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "flac", "m4a", "aac"]);

/** Supported text, markup, and source code extensions for text viewer. */
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "json", "js", "ts", "tsx", "jsx", "rs", "py", "html", "css",
  "yaml", "yml", "toml", "log", "csv", "sh", "bat", "cmd", "sql", "xml",
  "jsonc", "ini", "env", "gitignore", "dockerfile", "makefile", "c", "cpp", "h", "hpp"
]);

/** Supported document extension for PDF inline iframe viewer. */
const PDF_EXTENSIONS = new Set(["pdf"]);

/**
 * Formats a byte count into a human-readable size string.
 *
 * @param bytes - Size in bytes.
 * @returns Formatted size string, or "-" if invalid.
 */
function formatFileSize(bytes?: number): string {
  if (bytes == null || isNaN(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/**
 * Extracts the file extension in lower case from an item or path.
 *
 * @param item - Target item to inspect.
 * @returns File extension string without dot.
 */
function getItemExtension(item: QuickPreviewItem): string {
  if (item.extension) return item.extension.replace(/^\./, "").toLowerCase();
  const lastDot = item.name.lastIndexOf(".");
  if (lastDot > 0 && lastDot < item.name.length - 1) {
    return item.name.slice(lastDot + 1).toLowerCase();
  }
  return "";
}

/**
 * Quick Look preview modal providing instant full-size previews for images,
 * videos, audio files, code, markdown, PDFs, directories, and generic binaries.
 *
 * @param props - Component properties for preview modal state and handlers.
 * @returns React modal element or null when closed.
 */
export const QuickPreviewModal: React.FC<QuickPreviewModalProps> = ({
  isOpen,
  onClose,
  item,
  onNavigateFolder,
  onOpenFile,
  onNextItem,
  onPrevItem,
  hasNext = false,
  hasPrev = false,
}) => {
  // ── Image preview states ───────────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);

  // ── Code / text preview states ─────────────────────────────────────────────
  const [textContent, setTextContent] = useState<string>("");
  const [textLoading, setTextLoading] = useState<boolean>(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [wrapText, setWrapText] = useState<boolean>(true);

  // ── Folder preview states ──────────────────────────────────────────────────
  const [folderContents, setFolderContents] = useState<DirContents | null>(null);
  const [folderLoading, setFolderLoading] = useState<boolean>(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // ── Audio / video playback states ──────────────────────────────────────────
  const [mediaDuration, setMediaDuration] = useState<string>("");

  // Determine file category
  const extension = item ? getItemExtension(item) : "";
  const isFolder = item?.isFolder || false;
  const isImage = !isFolder && IMAGE_EXTENSIONS.has(extension);
  const isVideo = !isFolder && VIDEO_EXTENSIONS.has(extension);
  const isAudio = !isFolder && AUDIO_EXTENSIONS.has(extension);
  const isText = !isFolder && TEXT_EXTENSIONS.has(extension);
  const isPdf = !isFolder && PDF_EXTENSIONS.has(extension);

  // Convert filesystem path to a safe browser-renderable asset URL
  const fileAssetSrc = useMemo(() => {
    if (!item?.path || isFolder) return "";
    try {
      return convertFileSrc(item.path);
    } catch {
      return "";
    }
  }, [item?.path, isFolder]);

  // Reset local viewer states whenever active item changes
  useEffect(() => {
    setZoomLevel(1.0);
    setImageMeta(null);
    setTextContent("");
    setTextError(null);
    setCopiedCode(false);
    setFolderContents(null);
    setFolderError(null);
    setMediaDuration("");

    if (!isOpen || !item) return;

    // Load text content asynchronously for code and text files
    if (isText) {
      setTextLoading(true);
      invoke<string>("read_file_text_preview", { path: item.path })
        .then((text) => {
          setTextContent(text);
          setTextLoading(false);
        })
        .catch((err) => {
          setTextError(String(err));
          setTextLoading(false);
        });
    }

    // Load directory contents asynchronously for folders
    if (isFolder) {
      setFolderLoading(true);
      invoke<DirContents>("read_folder_contents", { dirPath: item.path })
        .then((contents) => {
          setFolderContents(contents);
          setFolderLoading(false);
        })
        .catch((err) => {
          setFolderError(String(err));
          setFolderLoading(false);
        });
    }
  }, [item?.path, isFolder, isText, isOpen]);

  // Keyboard navigation shortcuts listener
  useEffect(() => {
    if (!isOpen) return;

    /**
     * Handles keydown events to support Quick Look shortcuts.
     *
     * @param e - Triggering keyboard event.
     */
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when editing inside input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        onClose();
      } else if (e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Space key toggles Quick Look closed
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        if (hasPrev && onPrevItem) {
          e.preventDefault();
          onPrevItem();
        }
      } else if (e.key === "ArrowRight") {
        if (hasNext && onNextItem) {
          e.preventDefault();
          onNextItem();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, hasPrev, hasNext, onPrevItem, onNextItem]);

  /**
   * Copies the current code preview content to system clipboard.
   */
  const handleCopyCode = useCallback(() => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [textContent]);

  /**
   * Zooms in on the image preview up to maximum 4x.
   */
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(4.0, parseFloat((prev + 0.25).toFixed(2))));
  }, []);

  /**
   * Zooms out on the image preview down to minimum 0.25x.
   */
  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(0.25, parseFloat((prev - 0.25).toFixed(2))));
  }, []);

  /**
   * Resets image zoom to original scale 100%.
   */
  const handleZoomReset = useCallback(() => {
    setZoomLevel(1.0);
  }, []);

  if (!isOpen || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div
        className="relative flex flex-col w-full max-w-5xl h-[88vh] max-h-[920px] rounded-2xl border shadow-2xl overflow-hidden bg-card border-neutral-700/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header Toolbar ── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-sidebar border-b border-neutral-700/50 flex-shrink-0">
          {/* File identity and path */}
          <div className="flex items-center gap-3 min-w-0 mr-4">
            <div className="flex-shrink-0">
              {isFolder ? (
                <MacFolderIcon size={26} />
              ) : (
                <MacFileIcon extension={extension} size={26} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-primary-color truncate" title={item.name}>
                  {item.name}
                </h2>
                {extension && !isFolder && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-800/80 text-muted-color border border-neutral-700/50">
                    {extension}
                  </span>
                )}
                {isFolder && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#ff2d87]/20 text-[#ff85b8] border border-[#ff2d87]/30">
                    Folder
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-color truncate font-mono" title={item.path}>
                {item.path}
              </p>
            </div>
          </div>

          {/* Action buttons and controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {item.size != null && !isFolder && (
              <span className="hidden sm:inline-block text-xs font-medium text-muted-color px-2.5 py-1 rounded-lg bg-neutral-800/60 border border-neutral-700/40">
                {formatFileSize(item.size)}
              </span>
            )}

            {/* Cycle navigation buttons */}
            <div className="flex items-center rounded-xl bg-neutral-800/80 border border-neutral-700/50 p-0.5">
              <button
                type="button"
                onClick={onPrevItem}
                disabled={!hasPrev}
                title="Previous item (← ArrowLeft)"
                className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-700/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={onNextItem}
                disabled={!hasNext}
                title="Next item (→ ArrowRight)"
                className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-700/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Open Action Button */}
            {isFolder && onNavigateFolder && (
              <button
                type="button"
                onClick={() => {
                  onNavigateFolder(item.path);
                  onClose();
                }}
                className="btn btn-primary"
                title="Open this folder in Foldy"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span>Browse</span>
              </button>
            )}

            {!isFolder && onOpenFile && (
              <button
                type="button"
                onClick={() => onOpenFile(item.path)}
                className="btn btn-primary"
                title="Open in native default application"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                <span>Open</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close Quick Look (Space or Esc)"
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Main Preview Content Area ── */}
        <div className="flex-1 min-h-0 overflow-auto bg-main relative flex flex-col items-center justify-center">
          {/* 1. IMAGE PREVIEW */}
          {isImage && (
            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden p-4">
              <div className="relative flex-1 w-full flex items-center justify-center overflow-auto">
                <img
                  src={fileAssetSrc}
                  alt={item.name}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: "center center",
                    transition: "transform 0.15s ease-out",
                  }}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-xl"
                  onLoad={(e) => {
                    setImageMeta({
                      width: e.currentTarget.naturalWidth,
                      height: e.currentTarget.naturalHeight,
                    });
                  }}
                />
              </div>

              {/* Floating Image Control Bar */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-700/70 shadow-2xl backdrop-blur-md">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out (-)"
                  className="p-1 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleZoomReset}
                  title="Reset Zoom to 100%"
                  className="text-xs font-mono font-medium px-2 py-0.5 rounded text-neutral-200 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In (+)"
                  className="p-1 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {imageMeta && (
                  <>
                    <span className="w-px h-3.5 bg-neutral-700" />
                    <span className="text-[11px] font-mono text-muted-color">
                      {imageMeta.width} × {imageMeta.height}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 2. VIDEO PREVIEW */}
          {isVideo && (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-4">
              <div className="relative w-full max-w-4xl max-h-[75vh] flex items-center justify-center bg-black/50 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
                <video
                  src={fileAssetSrc}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh] rounded-xl outline-none"
                  onLoadedMetadata={(e) => {
                    const durationSec = Math.round(e.currentTarget.duration);
                    const mins = Math.floor(durationSec / 60);
                    const secs = durationSec % 60;
                    setMediaDuration(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
                  }}
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="badge badge-yellow">
                  {extension.toUpperCase()} VIDEO
                </span>
                {mediaDuration && (
                  <span className="text-xs text-muted-color font-mono">
                    Duration: {mediaDuration}
                  </span>
                )}
                {item.size != null && (
                  <span className="text-xs text-muted-color">
                    {formatFileSize(item.size)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 3. AUDIO PREVIEW */}
          {isAudio && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 gap-6">
              {/* Animated waveform visualizer mock */}
              <div className="flex items-center justify-center gap-1.5 h-24 px-8 py-4 bg-sidebar/80 rounded-2xl border border-neutral-700/50 shadow-inner">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-[#ff2d87] rounded-full animate-pulse"
                    style={{
                      height: `${Math.sin(i * 0.4) * 35 + 40}px`,
                      animationDuration: `${0.6 + (i % 5) * 0.2}s`,
                      animationDelay: `${(i % 7) * 0.1}s`,
                    }}
                  />
                ))}
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-semibold text-primary-color">{item.name}</h3>
                <p className="text-xs text-muted-color">
                  {extension.toUpperCase()} Audio • {formatFileSize(item.size)}
                  {mediaDuration ? ` • ${mediaDuration}` : ""}
                </p>
              </div>

              {/* Native audio player */}
              <div className="w-full max-w-md">
                <audio
                  src={fileAssetSrc}
                  controls
                  autoPlay
                  className="w-full outline-none"
                  onLoadedMetadata={(e) => {
                    const durationSec = Math.round(e.currentTarget.duration);
                    const mins = Math.floor(durationSec / 60);
                    const secs = durationSec % 60;
                    setMediaDuration(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
                  }}
                />
              </div>
            </div>
          )}

          {/* 4. CODE & TEXT PREVIEW */}
          {isText && (
            <div className="w-full h-full flex flex-col min-h-0 bg-neutral-950">
              {/* Code toolbar */}
              <div className="flex items-center justify-between px-4 py-2 bg-sidebar/80 border-b border-neutral-800 text-xs text-muted-color">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700/60 font-semibold text-neutral-300">
                    {extension}
                  </span>
                  <span>
                    {textContent ? `${textContent.split("\n").length} lines` : "Loading..."}
                  </span>
                  <span>•</span>
                  <span>{textContent ? `${textContent.length} chars` : "-"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWrapText((w) => !w)}
                    className="px-2 py-1 rounded hover:bg-neutral-800 text-[11px] transition-colors"
                  >
                    {wrapText ? "Disable Wrap" : "Enable Wrap"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium border border-neutral-700/60 transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 2H9a3 3 0 01-3-2z" />
                        </svg>
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code viewer body */}
              <div className="flex-1 min-h-0 overflow-auto font-mono text-xs leading-relaxed p-4 select-text">
                {textLoading && (
                  <div className="flex items-center justify-center h-full text-muted-color gap-2">
                    <div className="w-4 h-4 border-2 border-[#ff2d87] border-t-transparent rounded-full animate-spin" />
                    <span>Loading file preview...</span>
                  </div>
                )}

                {textError && (
                  <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2 p-4 text-center">
                    <p className="font-semibold">Unable to preview file as text</p>
                    <p className="text-xs text-neutral-400 max-w-md">{textError}</p>
                  </div>
                )}

                {!textLoading && !textError && (
                  <div className="flex">
                    {/* Line numbers column */}
                    <div className="select-none text-neutral-600 text-right pr-4 border-r border-neutral-800">
                      {textContent.split("\n").map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>

                    {/* Content column */}
                    <div
                      className={`pl-4 flex-1 text-neutral-200 ${
                        wrapText ? "whitespace-pre-wrap break-all" : "whitespace-pre overflow-x-auto"
                      }`}
                    >
                      {textContent}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. PDF PREVIEW */}
          {isPdf && (
            <div className="w-full h-full flex flex-col min-h-0 bg-neutral-900">
              <iframe
                src={fileAssetSrc}
                className="w-full h-full border-0 rounded-b-xl"
                title={item.name}
              />
            </div>
          )}

          {/* 6. FOLDER / DIRECTORY PREVIEW */}
          {isFolder && (
            <div className="w-full h-full flex flex-col min-h-0 p-6 max-w-4xl">
              {folderLoading && (
                <div className="flex items-center justify-center h-full text-muted-color gap-2">
                  <div className="w-4 h-4 border-2 border-[#ff2d87] border-t-transparent rounded-full animate-spin" />
                  <span>Inspecting directory contents...</span>
                </div>
              )}

              {folderError && (
                <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2 text-center">
                  <p className="font-semibold">Unable to read directory contents</p>
                  <p className="text-xs text-neutral-400">{folderError}</p>
                </div>
              )}

              {!folderLoading && !folderError && folderContents && (
                <div className="flex flex-col h-full min-h-0 gap-5">
                  {/* Folder Overview Banner */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-sidebar border border-neutral-700/50">
                    <div className="flex items-center gap-3">
                      <MacFolderIcon size={40} />
                      <div>
                        <h3 className="text-base font-semibold text-primary-color">{item.name}</h3>
                        <p className="text-xs text-muted-color">
                          Contains {folderContents.folders.length} subfolder(s) and {folderContents.files.length} file(s)
                        </p>
                      </div>
                    </div>

                    {onNavigateFolder && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateFolder(item.path);
                          onClose();
                        }}
                        className="btn btn-primary"
                      >
                        Open in Foldy
                      </button>
                    )}
                  </div>

                  {/* Top Items Table */}
                  <div className="flex-1 min-h-0 flex flex-col rounded-xl bg-sidebar/50 border border-neutral-700/40 overflow-hidden">
                    <div className="px-4 py-2.5 bg-sidebar border-b border-neutral-700/40 text-[11px] font-semibold text-muted-color uppercase tracking-wider flex justify-between">
                      <span>Name</span>
                      <span>Details</span>
                    </div>

                    <div className="flex-1 overflow-auto divide-y divide-neutral-800/60 p-1">
                      {folderContents.folders.map((folder) => (
                        <div
                          key={folder.path}
                          className="flex items-center justify-between px-3 py-2 hover:bg-neutral-800/40 rounded-lg text-xs transition-colors cursor-pointer"
                          onClick={() => {
                            onNavigateFolder?.(folder.path);
                            onClose();
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MacFolderIcon size={18} />
                            <span className="font-medium text-neutral-200 truncate">{folder.name}</span>
                          </div>
                          <span className="text-[11px] text-muted-color font-mono">
                            {folder.modified_at || "Folder"}
                          </span>
                        </div>
                      ))}

                      {folderContents.files.map((file: FileEntry) => (
                        <div
                          key={file.path}
                          className="flex items-center justify-between px-3 py-2 hover:bg-neutral-800/40 rounded-lg text-xs transition-colors cursor-pointer"
                          onClick={() => onOpenFile?.(file.path)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MacFileIcon extension={file.extension} size={18} />
                            <span className="text-neutral-300 truncate">{file.name}</span>
                          </div>
                          <span className="text-[11px] text-muted-color font-mono">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      ))}

                      {folderContents.folders.length === 0 && folderContents.files.length === 0 && (
                        <div className="text-center py-10 text-muted-color text-xs">
                          This folder is currently empty.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. GENERIC / OTHER BINARY FILES */}
          {!isImage && !isVideo && !isAudio && !isText && !isPdf && !isFolder && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 gap-6 text-center max-w-md">
              <div className="relative">
                <MacFileIcon extension={extension} size={84} />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-primary-color break-all">{item.name}</h3>
                <p className="text-xs text-muted-color">
                  {extension ? `${extension.toUpperCase()} File` : "Binary File"}
                  {item.size != null ? ` • ${formatFileSize(item.size)}` : ""}
                </p>
                {item.modified_at && (
                  <p className="text-[11px] text-muted-color font-mono">
                    Modified: {item.modified_at}
                  </p>
                )}
              </div>

              {onOpenFile && (
                <button
                  type="button"
                  onClick={() => onOpenFile(item.path)}
                  className="btn btn-primary px-5 py-2 text-sm rounded-xl shadow-lg"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                  <span>Open in OS Application</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom Status Bar ── */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-sidebar border-t border-neutral-700/50 text-[11px] text-muted-color flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>
              Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60 font-mono">Space</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60 font-mono">P</kbd> to toggle
            </span>
            <span>•</span>
            <span>
              Use <kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60 font-mono">←</kbd> <kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60 font-mono">→</kbd> arrows to cycle
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>Foldy Quick Look</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickPreviewModal;
