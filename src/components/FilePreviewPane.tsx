import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import mammoth from "mammoth";
import { MacFileIcon, MacFolderIcon } from "./MacIcons";
import { formatDate, formatSize } from "./FileItemShared";
import { formatFileType } from "../utils/view";
import type { DirContents } from "../types";
import {
  Button,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClose,
  IconExternalLink,
  IconEye,
  IconFolder,
} from "./ui";

// Ensure PDF.js worker is configured if PreviewPane mounts before QuickPreviewModal
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/** Item metadata passed to {@link FilePreviewPane}. */
export interface PreviewPaneItem {
  path: string;
  name: string;
  isFolder: boolean;
  extension?: string;
  size?: number;
  modified_at?: string;
  created_at?: string;
}

export interface FilePreviewPaneProps {
  /** Whether the Preview pane is open. */
  isOpen: boolean;
  /** Callback to close/hide the Preview pane. */
  onClose: () => void;
  /** Primary selected item to preview, or null if nothing is selected. */
  item: PreviewPaneItem | null;
  /** Total number of currently selected items. */
  selectedCount: number;
  /** Callback to open a file in the default OS application. */
  onOpenFile?: (path: string) => void;
  /** Callback to navigate into a folder. */
  onNavigateFolder?: (path: string) => void;
  /** Callback to pop out into the full Quick Look modal. */
  onOpenQuickLook?: (path: string, isFolder: boolean) => void;
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "mkv", "avi"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "flac", "m4a", "aac"]);
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "json", "js", "ts", "tsx", "jsx", "rs", "py", "html", "css",
  "yaml", "yml", "toml", "log", "csv", "sh", "bat", "cmd", "sql", "xml",
  "jsonc", "ini", "env", "gitignore", "dockerfile", "makefile", "c", "cpp", "h", "hpp",
]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const WORD_EXTENSIONS = new Set(["docx", "doc", "rtf", "odt"]);

function getItemExtension(item: PreviewPaneItem): string {
  if (item.extension) return item.extension.replace(/^\./, "").toLowerCase();
  const lastDot = item.name.lastIndexOf(".");
  if (lastDot > 0 && lastDot < item.name.length - 1) {
    return item.name.slice(lastDot + 1).toLowerCase();
  }
  return "";
}

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
 * Right-side Preview pane showing real inline previews (images, PDFs, text/code,
 * video, audio, Word docs, and folder summaries) plus core item metadata.
 * Collapses to an overlay on small widths so the file list never breaks.
 */
export const FilePreviewPane: React.FC<FilePreviewPaneProps> = ({
  isOpen,
  onClose,
  item,
  selectedCount,
  onOpenFile,
  onNavigateFolder,
  onOpenQuickLook,
}) => {
  const [blobSrc, setBlobSrc] = useState<string>("");
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);
  const [textContent, setTextContent] = useState<string>("");
  const [textLoading, setTextLoading] = useState<boolean>(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [wrapText, setWrapText] = useState<boolean>(true);

  const [docxHtml, setDocxHtml] = useState<string>("");
  const [docxLoading, setDocxLoading] = useState<boolean>(false);
  const [docxError, setDocxError] = useState<string | null>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfPageNum, setPdfPageNum] = useState<number>(1);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(0.85);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [folderContents, setFolderContents] = useState<DirContents | null>(null);
  const [folderLoading, setFolderLoading] = useState<boolean>(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [mediaDuration, setMediaDuration] = useState<string>("");

  const extension = item ? getItemExtension(item) : "";
  const isFolder = item?.isFolder ?? false;
  const isImage = !isFolder && IMAGE_EXTENSIONS.has(extension);
  const isVideo = !isFolder && VIDEO_EXTENSIONS.has(extension);
  const isAudio = !isFolder && AUDIO_EXTENSIONS.has(extension);
  const isText = !isFolder && TEXT_EXTENSIONS.has(extension);
  const isPdf = !isFolder && PDF_EXTENSIONS.has(extension);
  const isWord = !isFolder && WORD_EXTENSIONS.has(extension);

  const fileAssetSrc = useMemo(() => {
    if (!item?.path || isFolder) return "";
    try {
      return convertFileSrc(item.path);
    } catch {
      return "";
    }
  }, [item?.path, isFolder]);

  useEffect(() => {
    return () => {
      if (blobSrc) URL.revokeObjectURL(blobSrc);
    };
  }, [blobSrc]);

  const loadFileAsBlob = useCallback(async (path: string, mime: string) => {
    try {
      const bytes = await invoke<number[]>("read_file_bytes", { path });
      const uint8 = new Uint8Array(bytes);
      const url = URL.createObjectURL(new Blob([uint8], { type: mime }));
      setBlobSrc(url);
      return url;
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
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
    setPdfScale(0.85);
    setPdfError(null);
    setFolderContents(null);
    setFolderError(null);
    setMediaDuration("");

    if (!isOpen || !item) return;
    let cancelled = false;

    if (isText) {
      setTextLoading(true);
      invoke<string>("read_file_text_preview", { path: item.path })
        .then((text) => {
          if (!cancelled) {
            setTextContent(text);
            setTextLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setTextError(String(err));
            setTextLoading(false);
          }
        });
    } else if (isWord) {
      setDocxLoading(true);
      invoke<number[]>("read_file_bytes", { path: item.path })
        .then(async (bytes) => {
          if (cancelled) return;
          try {
            const uint8 = new Uint8Array(bytes);
            if (extension === "docx") {
              const res = await mammoth.convertToHtml({ arrayBuffer: uint8.buffer });
              if (!cancelled) setDocxHtml(res.value || "<p>Document is empty.</p>");
            } else {
              const raw = await mammoth.extractRawText({ arrayBuffer: uint8.buffer });
              if (!cancelled) {
                setDocxHtml(
                  raw.value
                    ? `<pre class="whitespace-pre-wrap font-sans text-xs">${raw.value}</pre>`
                    : "<p>Open in default application to view this document.</p>"
                );
              }
            }
          } catch {
            if (!cancelled) setDocxError("Could not parse Word document.");
          } finally {
            if (!cancelled) setDocxLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setDocxError(String(err));
            setDocxLoading(false);
          }
        });
    } else if (isPdf) {
      setPdfLoading(true);
      invoke<number[]>("read_file_bytes", { path: item.path })
        .then(async (bytes) => {
          if (cancelled) return;
          try {
            const uint8 = new Uint8Array(bytes);
            const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;
            if (!cancelled) {
              setPdfDoc(doc);
              setPdfTotalPages(doc.numPages);
              setPdfPageNum(1);
            }
          } catch (err) {
            if (!cancelled) setPdfError(`Could not render PDF: ${err}`);
          } finally {
            if (!cancelled) setPdfLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setPdfError(String(err));
            setPdfLoading(false);
          }
        });
    } else if (isFolder) {
      setFolderLoading(true);
      invoke<DirContents>("read_folder_contents", { dirPath: item.path })
        .then((contents) => {
          if (!cancelled) {
            setFolderContents(contents);
            setFolderLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setFolderError(String(err));
            setFolderLoading(false);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [item?.path, isOpen, isFolder, isText, isWord, isPdf, extension]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    pdfDoc.getPage(pdfPageNum).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      const viewport = page.getViewport({ scale: pdfScale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      page.render({ canvasContext: context, viewport });
    });
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pdfPageNum, pdfScale]);

  const handleCopyCode = useCallback(() => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  }, [textContent]);

  if (!isOpen) return null;

  const currentDisplaySrc = blobSrc || fileAssetSrc;
  const typeLabel = formatFileType(isFolder, extension);

  return (
    <>
      {/* Small-width overlay scrim */}
      <div
        className="lg:hidden absolute inset-0 bg-scrim z-20"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Preview pane"
        className="absolute inset-y-0 right-0 z-30 w-full max-w-sm lg:static lg:w-80 xl:w-96 lg:max-w-none shrink-0 flex flex-col bg-surface-container-low text-on-surface shadow-m3-3 lg:shadow-none overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-surface-container flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <IconEye size={16} className="text-primary shrink-0" />
            <h2 className="text-xs font-semibold text-on-surface tracking-wide uppercase">
              Preview
            </h2>
            {selectedCount > 1 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-m3-full bg-secondary-container text-on-secondary-container truncate">
                1 of {selectedCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {item && onOpenQuickLook && (
              <button
                type="button"
                onClick={() => onOpenQuickLook(item.path, item.isFolder)}
                title="Expand in Quick Look (Space / P)"
                aria-label="Expand in Quick Look"
                className="inline-flex items-center justify-center w-8 h-8 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest m3-pressable"
              >
                <IconExternalLink size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Close preview pane"
              aria-label="Close preview pane"
              className="inline-flex items-center justify-center w-8 h-8 rounded-m3-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest m3-pressable"
            >
              <IconClose size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        {!item ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-m3-lg bg-surface-container flex items-center justify-center text-on-surface-variant mb-3">
              <IconEye size={24} />
            </div>
            <p className="text-sm font-medium text-on-surface">
              Select a file to preview
            </p>
            <p className="text-xs text-on-surface-variant mt-1 max-w-[220px]">
              Single-click any file to view it here, or press Space for Quick Look.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* Inline Preview Stage */}
            <div className="rounded-m3-lg bg-surface-container overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
              {isImage && (
                <div className="w-full p-3 flex flex-col items-center gap-2">
                  <img
                    src={currentDisplaySrc}
                    alt={item.name}
                    className="max-h-64 max-w-full object-contain rounded-m3-sm"
                    onError={() => {
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
                  {imageMeta && (
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      {imageMeta.width} × {imageMeta.height} px
                    </span>
                  )}
                </div>
              )}

              {isVideo && (
                <div className="w-full p-2.5 flex flex-col items-center gap-2">
                  <video
                    src={currentDisplaySrc}
                    controls
                    playsInline
                    className="w-full max-h-60 rounded-m3-sm bg-surface-container-lowest outline-none"
                    onError={() => {
                      if (!blobSrc && item.size && item.size < 120 * 1024 * 1024) {
                        loadFileAsBlob(item.path, getMimeType(extension));
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      const sec = Math.round(e.currentTarget.duration);
                      if (Number.isFinite(sec)) {
                        const mins = Math.floor(sec / 60);
                        const rem = sec % 60;
                        setMediaDuration(`${mins}:${rem < 10 ? "0" : ""}${rem}`);
                      }
                    }}
                  />
                  {mediaDuration && (
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      Duration {mediaDuration}
                    </span>
                  )}
                </div>
              )}

              {isAudio && (
                <div className="w-full p-4 flex flex-col items-center gap-3">
                  <MacFileIcon extension={extension} size={42} />
                  <audio
                    src={currentDisplaySrc}
                    controls
                    className="w-full outline-none"
                    onError={() => {
                      if (!blobSrc) {
                        loadFileAsBlob(item.path, getMimeType(extension));
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      const sec = Math.round(e.currentTarget.duration);
                      if (Number.isFinite(sec)) {
                        const mins = Math.floor(sec / 60);
                        const rem = sec % 60;
                        setMediaDuration(`${mins}:${rem < 10 ? "0" : ""}${rem}`);
                      }
                    }}
                  />
                  {mediaDuration && (
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      Duration {mediaDuration}
                    </span>
                  )}
                </div>
              )}

              {isPdf && (
                <div className="w-full flex flex-col">
                  {pdfLoading ? (
                    <p className="p-6 text-xs text-on-surface-variant text-center">
                      Rendering PDF…
                    </p>
                  ) : pdfError ? (
                    <p className="p-4 text-xs text-error text-center">{pdfError}</p>
                  ) : (
                    <>
                      <div className="p-2 overflow-auto max-h-72 flex justify-center bg-surface-container-highest/50">
                        <canvas ref={canvasRef} className="max-w-full h-auto rounded-m3-xs" />
                      </div>
                      <div className="px-3 py-2 bg-surface-container-high flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={pdfPageNum <= 1}
                            onClick={() => setPdfPageNum((p) => Math.max(1, p - 1))}
                            aria-label="Previous page"
                            className="p-1 rounded-m3-full hover:bg-surface-container-highest disabled:opacity-35"
                          >
                            <IconArrowLeft size={14} />
                          </button>
                          <span className="font-mono text-[11px] text-on-surface-variant">
                            {pdfPageNum} / {pdfTotalPages}
                          </span>
                          <button
                            type="button"
                            disabled={pdfPageNum >= pdfTotalPages}
                            onClick={() => setPdfPageNum((p) => Math.min(pdfTotalPages, p + 1))}
                            aria-label="Next page"
                            className="p-1 rounded-m3-full hover:bg-surface-container-highest disabled:opacity-35"
                          >
                            <IconArrowRight size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPdfScale((s) => Math.max(0.5, Number((s - 0.15).toFixed(2))))}
                            className="px-1.5 py-0.5 rounded-m3-xs hover:bg-surface-container-highest text-[11px]"
                            title="Zoom out"
                          >
                            −
                          </button>
                          <span className="font-mono text-[11px] text-on-surface-variant">
                            {Math.round(pdfScale * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setPdfScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))))}
                            className="px-1.5 py-0.5 rounded-m3-xs hover:bg-surface-container-highest text-[11px]"
                            title="Zoom in"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {isText && (
                <div className="w-full flex flex-col">
                  <div className="px-3 py-1.5 bg-surface-container-high flex items-center justify-between text-[11px]">
                    <span className="font-mono uppercase text-on-surface-variant">
                      {extension || "text"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setWrapText((w) => !w)}
                        className="px-2 py-0.5 rounded-m3-xs hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
                      >
                        {wrapText ? "No wrap" : "Wrap"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-m3-xs hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
                      >
                        {copiedCode ? <IconCheck size={12} /> : null}
                        <span>{copiedCode ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                  {textLoading ? (
                    <p className="p-4 text-xs text-on-surface-variant">Loading text…</p>
                  ) : textError ? (
                    <p className="p-4 text-xs text-error">{textError}</p>
                  ) : (
                    <pre
                      className={`p-3 text-[11px] leading-relaxed font-mono text-on-surface max-h-72 overflow-auto ${
                        wrapText ? "whitespace-pre-wrap break-words" : "whitespace-pre"
                      }`}
                    >
                      {textContent || "(Empty file)"}
                    </pre>
                  )}
                </div>
              )}

              {isWord && (
                <div className="w-full max-h-72 overflow-auto p-3 text-xs text-on-surface">
                  {docxLoading ? (
                    <p className="text-on-surface-variant">Loading document…</p>
                  ) : docxError ? (
                    <p className="text-error">{docxError}</p>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none text-on-surface"
                      dangerouslySetInnerHTML={{ __html: docxHtml }}
                    />
                  )}
                </div>
              )}

              {isFolder && (
                <div className="w-full p-5 flex flex-col items-center text-center gap-2.5">
                  <MacFolderIcon size={48} />
                  {folderLoading ? (
                    <p className="text-xs text-on-surface-variant">Reading folder…</p>
                  ) : folderError ? (
                    <p className="text-xs text-error">{folderError}</p>
                  ) : folderContents ? (
                    <p className="text-xs text-on-surface-variant">
                      {folderContents.folders.length} folder(s), {folderContents.files.length} file(s)
                    </p>
                  ) : null}
                  {onNavigateFolder && (
                    <Button
                      variant="tonal"
                      size="sm"
                      onClick={() => onNavigateFolder(item.path)}
                      leadingIcon={<IconFolder size={14} />}
                    >
                      Open folder
                    </Button>
                  )}
                </div>
              )}

              {!isImage && !isVideo && !isAudio && !isPdf && !isText && !isWord && !isFolder && (
                <div className="w-full p-6 flex flex-col items-center text-center gap-3">
                  <MacFileIcon extension={extension} size={48} />
                  <div>
                    <p className="text-xs font-medium text-on-surface">
                      No inline preview
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {typeLabel} files can be opened in their default app.
                    </p>
                  </div>
                  {onOpenFile && (
                    <Button
                      variant="tonal"
                      size="sm"
                      onClick={() => onOpenFile(item.path)}
                      leadingIcon={<IconExternalLink size={14} />}
                    >
                      Open in default app
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Item Name + Action */}
            <div className="space-y-1">
              <p className="text-sm font-semibold text-on-surface break-words" title={item.name}>
                {item.name}
              </p>
              <p className="text-[11px] text-on-surface-variant font-mono break-all">
                {item.path}
              </p>
            </div>

            {/* Core Metadata Card (Tonal surface, no outline clutter) */}
            <dl className="rounded-m3-md bg-surface-container p-3 grid grid-cols-[88px_1fr] gap-y-2 gap-x-2 text-xs">
              <dt className="text-on-surface-variant">Type</dt>
              <dd className="text-on-surface font-medium truncate">{typeLabel}</dd>

              <dt className="text-on-surface-variant">Size</dt>
              <dd className="text-on-surface tabular-nums">
                {isFolder ? "—" : formatSize(item.size ?? -1)}
              </dd>

              <dt className="text-on-surface-variant">Modified</dt>
              <dd className="text-on-surface">{formatDate(item.modified_at || "")}</dd>

              <dt className="text-on-surface-variant">Created</dt>
              <dd className="text-on-surface">{formatDate(item.created_at || "")}</dd>
            </dl>

            {!isFolder && onOpenFile && (
              <Button
                variant="tonal"
                size="sm"
                className="w-full"
                onClick={() => onOpenFile(item.path)}
                leadingIcon={<IconExternalLink size={14} />}
              >
                Open in default app
              </Button>
            )}
          </div>
        )}
      </aside>
    </>
  );
};

export default FilePreviewPane;
