import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import mammoth from "mammoth";
import { MacFileIcon, MacFolderIcon } from "./MacIcons";
import type { DirContents, FileEntry } from "../types";

// Configure worker for PDF.js canvas rendering
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

/** Supported document extension for PDF inline viewer. */
const PDF_EXTENSIONS = new Set(["pdf"]);

/** Supported Microsoft Word document extensions. */
const WORD_EXTENSIONS = new Set(["docx", "doc", "rtf", "odt"]);

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
 * Maps common image and media extensions to standard MIME types.
 *
 * @param ext - Lowercase file extension.
 * @returns Standard MIME type string.
 */
function getMimeType(ext: string): string {
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "svg": return "image/svg+xml";
    case "bmp": return "image/bmp";
    case "ico": return "image/x-icon";
    case "mp4": return "video/mp4";
    case "webm": return "video/webm";
    case "mov": return "video/quicktime";
    case "mp3": return "audio/mpeg";
    case "wav": return "audio/wav";
    case "ogg": return "audio/ogg";
    case "pdf": return "application/pdf";
    default: return "application/octet-stream";
  }
}

/**
 * Quick Look preview modal providing instant full-size previews for images,
 * videos, audio files, Word documents, PDFs, code, markdown, and directories.
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
  const [blobSrc, setBlobSrc] = useState<string>("");

  // ── Code / text preview states ─────────────────────────────────────────────
  const [textContent, setTextContent] = useState<string>("");
  const [textLoading, setTextLoading] = useState<boolean>(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [wrapText, setWrapText] = useState<boolean>(true);

  // ── Word document preview states ───────────────────────────────────────────
  const [docxHtml, setDocxHtml] = useState<string>("");
  const [docxLoading, setDocxLoading] = useState<boolean>(false);
  const [docxError, setDocxError] = useState<string | null>(null);

  // ── PDF preview states ─────────────────────────────────────────────────────
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfPageNum, setPdfPageNum] = useState<number>(1);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.25);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
  const isWord = !isFolder && WORD_EXTENSIONS.has(extension);

  // Convert filesystem path to a safe browser-renderable asset URL
  const fileAssetSrc = useMemo(() => {
    if (!item?.path || isFolder) return "";
    try {
      return convertFileSrc(item.path);
    } catch {
      return "";
    }
  }, [item?.path, isFolder]);

  // Cleanup blob object URLs when unmounting or switching items
  useEffect(() => {
    return () => {
      if (blobSrc) {
        URL.revokeObjectURL(blobSrc);
      }
    };
  }, [blobSrc]);

  // Fallback to reading raw file bytes into blob if asset protocol fails
  const loadFileAsBlob = useCallback(async (path: string, mime: string) => {
    try {
      const bytes = await invoke<number[]>("read_file_bytes", { path });
      const uint8 = new Uint8Array(bytes);
      const blob = new Blob([uint8], { type: mime });
      const url = URL.createObjectURL(blob);
      setBlobSrc(url);
      return url;
    } catch (err) {
      console.error("Failed to read file as blob:", err);
      return "";
    }
  }, []);

  // Reset local viewer states whenever active item changes
  useEffect(() => {
    setZoomLevel(1.0);
    setImageMeta(null);
    setBlobSrc("");
    setTextContent("");
    setTextError(null);
    setCopiedCode(false);
    setDocxHtml("");
    setDocxError(null);
    setPdfDoc(null);
    setPdfPageNum(1);
    setPdfTotalPages(1);
    setPdfScale(1.25);
    setPdfError(null);
    setFolderContents(null);
    setFolderError(null);
    setMediaDuration("");

    if (!isOpen || !item) return;

    // 1. Text & Code files
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

    // 2. Word documents (.docx, .doc)
    if (isWord) {
      setDocxLoading(true);
      invoke<number[]>("read_file_bytes", { path: item.path })
        .then(async (bytes) => {
          try {
            const uint8 = new Uint8Array(bytes);
            if (extension === "docx") {
              const res = await mammoth.convertToHtml({ arrayBuffer: uint8.buffer });
              setDocxHtml(res.value || "<p class='italic text-on-surface-variant'>Document is empty.</p>");
            } else {
              // Legacy .doc format: extract text strings if available
              const raw = await mammoth.extractRawText({ arrayBuffer: uint8.buffer });
              setDocxHtml(
                raw.value
                  ? `<pre class="whitespace-pre-wrap font-sans text-sm">${raw.value}</pre>`
                  : "<p class='italic text-on-surface-variant'>Binary .doc file. Click 'Open in OS Application' to view in Microsoft Word.</p>"
              );
            }
          } catch (e) {
            setDocxError("Could not parse Word document structure.");
          } finally {
            setDocxLoading(false);
          }
        })
        .catch((err) => {
          setDocxError(String(err));
          setDocxLoading(false);
        });
    }

    // 3. PDF Documents (Render via PDF.js)
    if (isPdf) {
      setPdfLoading(true);
      invoke<number[]>("read_file_bytes", { path: item.path })
        .then(async (bytes) => {
          try {
            const uint8 = new Uint8Array(bytes);
            const loadingTask = pdfjsLib.getDocument({ data: uint8 });
            const doc = await loadingTask.promise;
            setPdfDoc(doc);
            setPdfTotalPages(doc.numPages);
            setPdfPageNum(1);
          } catch (err) {
            setPdfError(`Could not render PDF: ${err}`);
          } finally {
            setPdfLoading(false);
          }
        })
        .catch((err) => {
          setPdfError(String(err));
          setPdfLoading(false);
        });
    }

    // 4. Folders
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
  }, [item?.path, isFolder, isText, isWord, isPdf, extension, isOpen]);

  // PDF Page Renderer (renders current page to HTML5 Canvas)
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    pdfDoc.getPage(pdfPageNum).then((page) => {
      if (isCancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      const viewport = page.getViewport({ scale: pdfScale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      page.render(renderContext);
    });

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pdfPageNum, pdfScale]);

  // Keyboard navigation shortcuts listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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

  /** Copies the current code preview content to system clipboard. */
  const handleCopyCode = useCallback(() => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [textContent]);

  /** Zooms in on image or PDF preview. */
  const handleZoomIn = useCallback(() => {
    if (isPdf) {
      setPdfScale((s) => Math.min(3.0, parseFloat((s + 0.25).toFixed(2))));
    } else {
      setZoomLevel((prev) => Math.min(4.0, parseFloat((prev + 0.25).toFixed(2))));
    }
  }, [isPdf]);

  /** Zooms out on image or PDF preview. */
  const handleZoomOut = useCallback(() => {
    if (isPdf) {
      setPdfScale((s) => Math.max(0.5, parseFloat((s - 0.25).toFixed(2))));
    } else {
      setZoomLevel((prev) => Math.max(0.25, parseFloat((prev - 0.25).toFixed(2))));
    }
  }, [isPdf]);

  /** Resets zoom to default 100%. */
  const handleZoomReset = useCallback(() => {
    if (isPdf) {
      setPdfScale(1.25);
    } else {
      setZoomLevel(1.0);
    }
  }, [isPdf]);

  if (!isOpen || !item) return null;

  const currentDisplaySrc = blobSrc || fileAssetSrc;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-scrim backdrop-blur-sm select-none"
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div
        className="relative flex flex-col w-full max-w-5xl h-[88vh] max-h-[920px] rounded-m3-xl shadow-m3-3 overflow-hidden bg-surface-container-high text-on-surface animate-m3-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-surface-container flex-shrink-0">
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
                <h2 className="text-sm font-semibold text-on-surface truncate" title={item.name}>
                  {item.name}
                </h2>
                {extension && !isFolder && (
                  <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-m3-full bg-secondary-container text-on-secondary-container">
                    {extension}
                  </span>
                )}
                {isFolder && (
                  <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-m3-full bg-primary-container text-on-primary-container">
                    Folder
                  </span>
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant truncate font-mono" title={item.path}>
                {item.path}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {item.size != null && !isFolder && (
              <span className="hidden sm:inline-block text-xs font-medium text-on-surface-variant px-2.5 py-1 rounded-m3-full bg-surface-container-high">
                {formatFileSize(item.size)}
              </span>
            )}

            <div className="flex items-center rounded-m3-full bg-surface-container-high p-0.5">
              <button
                type="button"
                onClick={onPrevItem}
                disabled={!hasPrev}
                title="Previous item (← ArrowLeft)"
                className="p-1.5 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
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
                className="p-1.5 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
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
              className="p-1.5 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
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
        <div className="flex-1 min-h-0 overflow-auto bg-surface relative flex flex-col items-center justify-center">
          {/* 1. IMAGE PREVIEW */}
          {isImage && (
            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden p-4">
              <div className="relative flex-1 w-full flex items-center justify-center overflow-auto">
                <img
                  src={currentDisplaySrc}
                  alt={item.name}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: "center center",
                    transition: "transform 0.15s ease-out",
                  }}
                  className="max-h-full max-w-full object-contain rounded-m3-sm shadow-m3-2"
                  onError={() => {
                    // Fallback to reading raw file bytes into Blob if asset protocol fails
                    if (!blobSrc) {
                      loadFileAsBlob(item.path, getMimeType(extension));
                    }
                  }}
                  onLoad={(e) => {
                    setImageMeta({
                      width: e.currentTarget.naturalWidth,
                      height: e.currentTarget.naturalHeight,
                    });
                  }}
                />
              </div>

              {/* Floating Image Control Bar */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-m3-full bg-surface-container-highest/95 border border-outline-variant shadow-m3-3 backdrop-blur-md">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out (-)"
                  className="p-1 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
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
                  className="text-xs font-mono font-medium px-2 py-0.5 rounded text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In (+)"
                  className="p-1 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
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
                    <span className="w-px h-3.5 bg-outline-variant" />
                    <span className="text-[11px] font-mono text-on-surface-variant">
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
              <div className="relative w-full max-w-4xl max-h-[75vh] flex items-center justify-center bg-surface-container-lowest rounded-m3-lg overflow-hidden border border-outline-variant shadow-m3-3">
                <video
                  src={currentDisplaySrc}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[70vh] rounded-m3-md outline-none"
                  onError={() => {
                    // Fallback to loading blob directly if asset stream fails
                    if (!blobSrc && item.size && item.size < 120 * 1024 * 1024) {
                      loadFileAsBlob(item.path, getMimeType(extension));
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    const durationSec = Math.round(e.currentTarget.duration);
                    const mins = Math.floor(durationSec / 60);
                    const secs = durationSec % 60;
                    setMediaDuration(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
                  }}
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="badge badge-yellow uppercase">
                  {extension} VIDEO
                </span>
                {mediaDuration && (
                  <span className="text-xs text-on-surface-variant font-mono">
                    Duration: {mediaDuration}
                  </span>
                )}
                {item.size != null && (
                  <span className="text-xs text-on-surface-variant">
                    {formatFileSize(item.size)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 3. AUDIO PREVIEW */}
          {isAudio && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 gap-6">
              <div className="flex items-center justify-center gap-1.5 h-24 px-8 py-4 bg-surface-container rounded-m3-lg border border-outline-variant">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-primary rounded-m3-full animate-pulse"
                    style={{
                      height: `${Math.sin(i * 0.4) * 35 + 40}px`,
                      animationDuration: `${0.6 + (i % 5) * 0.2}s`,
                      animationDelay: `${(i % 7) * 0.1}s`,
                    }}
                  />
                ))}
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-semibold text-on-surface">{item.name}</h3>
                <p className="text-xs text-on-surface-variant">
                  {extension.toUpperCase()} Audio • {formatFileSize(item.size)}
                  {mediaDuration ? ` • ${mediaDuration}` : ""}
                </p>
              </div>

              <div className="w-full max-w-md">
                <audio
                  src={currentDisplaySrc}
                  controls
                  autoPlay
                  className="w-full outline-none"
                  onError={() => {
                    if (!blobSrc) {
                      loadFileAsBlob(item.path, getMimeType(extension));
                    }
                  }}
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
            <div className="w-full h-full flex flex-col min-h-0 bg-surface-container-lowest">
              <div className="flex items-center justify-between px-4 py-2 bg-surface-container border-b border-outline-variant text-xs text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant font-semibold text-on-surface">
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
                    className="px-2 py-1 rounded hover:bg-surface-container-high text-[11px] transition-colors"
                  >
                    {wrapText ? "Disable Wrap" : "Enable Wrap"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-medium border border-outline-variant transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-success" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-success font-semibold">Copied!</span>
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

              <div className="flex-1 min-h-0 overflow-auto font-mono text-xs leading-relaxed p-4 select-text">
                {textLoading && (
                  <div className="flex items-center justify-center h-full text-on-surface-variant gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-m3-full animate-spin" />
                    <span>Loading file preview...</span>
                  </div>
                )}

                {textError && (
                  <div className="flex flex-col items-center justify-center h-full text-error gap-2 p-4 text-center">
                    <p className="font-semibold">Unable to preview file as text</p>
                    <p className="text-xs text-on-surface-variant max-w-md">{textError}</p>
                  </div>
                )}

                {!textLoading && !textError && (
                  <div className="flex">
                    <div className="select-none text-on-surface-variant/60 text-right pr-4 border-r border-outline-variant">
                      {textContent.split("\n").map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>

                    <div
                      className={`pl-4 flex-1 text-on-surface ${
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

          {/* 5. WORD DOCUMENT PREVIEW (.docx, .doc) */}
          {isWord && (
            <div className="w-full h-full flex flex-col min-h-0 bg-surface-container-low">
              {/* Word toolbar */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-surface-container border-b border-outline-variant text-xs text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span className="font-bold bg-primary-container text-on-primary-container px-2 py-0.5 rounded-m3-xs uppercase">
                    Word Document
                  </span>
                  <span>{item.name}</span>
                </div>

                {onOpenFile && (
                  <button
                    type="button"
                    onClick={() => onOpenFile(item.path)}
                    className="btn btn-primary"
                  >
                    <span>Open in Microsoft Word</span>
                  </button>
                )}
              </div>

              {/* Word document page simulation */}
              <div className="flex-1 min-h-0 overflow-auto p-6 sm:p-10 flex justify-center bg-surface">
                {docxLoading && (
                  <div className="flex items-center justify-center h-full text-on-surface-variant gap-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-m3-full animate-spin" />
                    <span>Parsing Word document...</span>
                  </div>
                )}

                {docxError && (
                  <div className="flex flex-col items-center justify-center h-full text-error gap-2 text-center max-w-md">
                    <p className="font-bold">Could not parse document</p>
                    <p className="text-xs text-on-surface-variant">{docxError}</p>
                    {onOpenFile && (
                      <button
                        type="button"
                        onClick={() => onOpenFile(item.path)}
                        className="btn btn-primary mt-3"
                      >
                        Open with Word
                      </button>
                    )}
                  </div>
                )}

                {!docxLoading && !docxError && (
                  <div className="w-full max-w-3xl bg-surface-container-lowest text-on-surface p-8 sm:p-14 rounded-m3-md shadow-m3-3 border border-outline-variant min-h-[500px] select-text font-serif leading-relaxed overflow-y-auto">
                    <div
                      className="prose prose-sm max-w-none text-on-surface leading-relaxed space-y-4"
                      dangerouslySetInnerHTML={{ __html: docxHtml }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. PDF PREVIEW (Rendered via PDF.js HTML5 Canvas) */}
          {isPdf && (
            <div className="w-full h-full flex flex-col min-h-0 bg-surface-container-lowest">
              {/* PDF Toolbar */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-surface-container border-b border-outline-variant text-xs">
                {/* Page Navigation */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pdfPageNum <= 1}
                    onClick={() => setPdfPageNum((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-m3-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface disabled:opacity-40 transition-colors"
                    title="Previous page"
                  >
                    ← Prev
                  </button>
                  <span className="text-on-surface-variant font-mono text-[11px]">
                    Page {pdfPageNum} of {pdfTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={pdfPageNum >= pdfTotalPages}
                    onClick={() => setPdfPageNum((p) => Math.min(pdfTotalPages, p + 1))}
                    className="px-2.5 py-1 rounded-m3-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface disabled:opacity-40 transition-colors"
                    title="Next page"
                  >
                    Next →
                  </button>
                </div>

                {/* PDF Zoom Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="px-2 py-1 rounded-m3-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomReset}
                    className="px-2 py-0.5 rounded-m3-xs bg-surface-container-high text-[11px] font-mono text-on-surface"
                    title="Reset Zoom"
                  >
                    {Math.round(pdfScale * 80)}%
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="px-2 py-1 rounded-m3-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
                    title="Zoom In"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* PDF Document Canvas View */}
              <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-surface">
                {pdfLoading && (
                  <div className="flex items-center justify-center h-full text-on-surface-variant gap-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-m3-full animate-spin" />
                    <span>Rendering PDF document...</span>
                  </div>
                )}

                {pdfError && (
                  <div className="flex flex-col items-center justify-center h-full text-error gap-2 text-center max-w-md">
                    <p className="font-bold">Unable to display PDF</p>
                    <p className="text-xs text-on-surface-variant">{pdfError}</p>
                    {onOpenFile && (
                      <button
                        type="button"
                        onClick={() => onOpenFile(item.path)}
                        className="btn btn-primary mt-3"
                      >
                        Open in System PDF Viewer
                      </button>
                    )}
                  </div>
                )}

                {!pdfLoading && !pdfError && (
                  <div className="shadow-m3-3 rounded-m3-sm overflow-hidden border border-outline-variant bg-surface-container-lowest">
                    <canvas ref={canvasRef} className="block max-w-full" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. FOLDER / DIRECTORY PREVIEW */}
          {isFolder && (
            <div className="w-full h-full flex flex-col min-h-0 p-6 max-w-4xl">
              {folderLoading && (
                <div className="flex items-center justify-center h-full text-on-surface-variant gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-m3-full animate-spin" />
                  <span>Inspecting directory contents...</span>
                </div>
              )}

              {folderError && (
                <div className="flex flex-col items-center justify-center h-full text-error gap-2 text-center">
                  <p className="font-semibold">Unable to read directory contents</p>
                  <p className="text-xs text-on-surface-variant">{folderError}</p>
                </div>
              )}

              {!folderLoading && !folderError && folderContents && (
                <div className="flex flex-col h-full min-h-0 gap-5">
                  <div className="flex items-center justify-between p-4 rounded-m3-md bg-surface-container border border-outline-variant">
                    <div className="flex items-center gap-3">
                      <MacFolderIcon size={40} />
                      <div>
                        <h3 className="text-base font-semibold text-on-surface">{item.name}</h3>
                        <p className="text-xs text-on-surface-variant">
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

                  <div className="flex-1 min-h-0 flex flex-col rounded-m3-md bg-surface-container-low border border-outline-variant overflow-hidden">
                    <div className="px-4 py-2.5 bg-surface-container border-b border-outline-variant text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex justify-between">
                      <span>Name</span>
                      <span>Details</span>
                    </div>

                    <div className="flex-1 overflow-auto divide-y divide-outline-variant/50 p-1">
                      {folderContents.folders.map((folder) => (
                        <div
                          key={folder.path}
                          className="flex items-center justify-between px-3 py-2 hover:bg-surface-container-high rounded-m3-sm text-xs transition-colors cursor-pointer"
                          onClick={() => {
                            onNavigateFolder?.(folder.path);
                            onClose();
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MacFolderIcon size={18} />
                            <span className="font-medium text-on-surface truncate">{folder.name}</span>
                          </div>
                          <span className="text-[11px] text-on-surface-variant font-mono">
                            {folder.modified_at || "Folder"}
                          </span>
                        </div>
                      ))}

                      {folderContents.files.map((file: FileEntry) => (
                        <div
                          key={file.path}
                          className="flex items-center justify-between px-3 py-2 hover:bg-surface-container-high rounded-m3-sm text-xs transition-colors cursor-pointer"
                          onClick={() => onOpenFile?.(file.path)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MacFileIcon extension={file.extension} size={18} />
                            <span className="text-on-surface truncate">{file.name}</span>
                          </div>
                          <span className="text-[11px] text-on-surface-variant font-mono">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      ))}

                      {folderContents.folders.length === 0 && folderContents.files.length === 0 && (
                        <div className="text-center py-10 text-on-surface-variant text-xs">
                          This folder is currently empty.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 8. GENERIC / OTHER BINARY FILES */}
          {!isImage && !isVideo && !isAudio && !isText && !isPdf && !isWord && !isFolder && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 gap-6 text-center max-w-md">
              <div className="relative">
                <MacFileIcon extension={extension} size={84} />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-on-surface break-all">{item.name}</h3>
                <p className="text-xs text-on-surface-variant">
                  {extension ? `${extension.toUpperCase()} File` : "Binary File"}
                  {item.size != null ? ` • ${formatFileSize(item.size)}` : ""}
                </p>
                {item.modified_at && (
                  <p className="text-[11px] text-on-surface-variant font-mono">
                    Modified: {item.modified_at}
                  </p>
                )}
              </div>

              {onOpenFile && (
                <button
                  type="button"
                  onClick={() => onOpenFile(item.path)}
                  className="btn btn-primary px-5 py-2 text-sm rounded-m3-full shadow-m3-2"
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
        <div className="flex items-center justify-between px-5 py-2.5 bg-surface-container border-t border-outline-variant text-[11px] text-on-surface-variant flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>
              Press <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface border border-outline-variant font-mono">Space</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface border border-outline-variant font-mono">P</kbd> to toggle
            </span>
            <span>•</span>
            <span>
              Use <kbd className="px-1 py-0.5 rounded bg-surface-container-high text-on-surface border border-outline-variant font-mono">←</kbd> <kbd className="px-1 py-0.5 rounded bg-surface-container-high text-on-surface border border-outline-variant font-mono">→</kbd> arrows to cycle
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
