import React from "react";

export interface FileTypeIconProps {
  /** File extension without leading dot, or omitted for folders. */
  extension?: string;
  /** Whether the item is a folder. */
  isFolder?: boolean;
  /** Icon size in pixels. */
  size?: number;
  className?: string;
}

type FileCategory =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "code"
  | "pdf"
  | "doc"
  | "sheet"
  | "archive"
  | "generic";

const EXT_CATEGORY: Record<string, FileCategory> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  ico: "image",
  avif: "image",
  mp4: "video",
  mov: "video",
  mkv: "video",
  avi: "video",
  webm: "video",
  mp3: "audio",
  wav: "audio",
  flac: "audio",
  ogg: "audio",
  m4a: "audio",
  aac: "audio",
  ts: "code",
  tsx: "code",
  js: "code",
  jsx: "code",
  py: "code",
  rs: "code",
  go: "code",
  java: "code",
  c: "code",
  cpp: "code",
  cs: "code",
  html: "code",
  css: "code",
  scss: "code",
  json: "code",
  yaml: "code",
  yml: "code",
  toml: "code",
  xml: "code",
  sh: "code",
  bat: "code",
  ps1: "code",
  sql: "code",
  pdf: "pdf",
  doc: "doc",
  docx: "doc",
  txt: "doc",
  md: "doc",
  rtf: "doc",
  csv: "sheet",
  xls: "sheet",
  xlsx: "sheet",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
};

const CATEGORY_TINT: Record<FileCategory, string> = {
  folder: "text-primary",
  image: "text-emerald-600 dark:text-emerald-400",
  video: "text-violet-600 dark:text-violet-400",
  audio: "text-rose-500 dark:text-rose-400",
  code: "text-sky-600 dark:text-sky-400",
  pdf: "text-red-600 dark:text-red-400",
  doc: "text-blue-600 dark:text-blue-400",
  sheet: "text-green-600 dark:text-green-400",
  archive: "text-amber-600 dark:text-amber-400",
  generic: "text-on-surface-variant",
};

function getCategory(extension?: string, isFolder?: boolean): FileCategory {
  if (isFolder) return "folder";
  const ext = (extension || "").toLowerCase().replace(/^\./, "");
  return EXT_CATEGORY[ext] ?? "generic";
}

/**
 * Consistent Material Symbols-style file and folder icon set with subtle semantic tinting.
 */
export const FileTypeIcon: React.FC<FileTypeIconProps> = ({
  extension,
  isFolder = false,
  size = 20,
  className = "",
}) => {
  const category = getCategory(extension, isFolder);
  const tint = CATEGORY_TINT[category];
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: `shrink-0 ${tint} ${className}`,
  };

  if (category === "folder") {
    return (
      <svg {...common}>
        <path
          d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
          fill="currentColor"
          fillOpacity={0.14}
        />
      </svg>
    );
  }

  if (category === "image") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="m21 15-4.5-4.5L9 18" />
      </svg>
    );
  }

  if (category === "video") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m10 9 5 3-5 3V9z" fill="currentColor" fillOpacity={0.2} />
      </svg>
    );
  }

  if (category === "audio") {
    return (
      <svg {...common}>
        <path d="M9 18V6l10-2v12" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="16.5" cy="16" r="2.5" />
      </svg>
    );
  }

  if (category === "code") {
    return (
      <svg {...common}>
        <path d="m8 9-4 3 4 3" />
        <path d="m16 9 4 3-4 3" />
        <path d="m13.5 6-3 12" />
      </svg>
    );
  }

  if (category === "archive") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M12 4v16" />
        <path d="M10 8h2M12 11h2M10 14h2" />
      </svg>
    );
  }

  if (category === "sheet") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 10h16M10 4v16" />
      </svg>
    );
  }

  if (category === "pdf" || category === "doc") {
    return (
      <svg {...common}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
};
