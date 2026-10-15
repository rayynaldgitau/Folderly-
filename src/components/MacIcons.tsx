import React, { useId } from "react";

/**
 * Supported badge categories mapping file extensions to macOS visual styles.
 */
export type MacFileCategory =
  | "binary"
  | "photo"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "video"
  | "audio"
  | "code"
  | "archive"
  | "default";

/**
 * Properties accepted by the MacFolderIcon component.
 */
export interface MacFolderIconProps {
  /** Dimension size in pixels or CSS units. Defaults to 28. */
  size?: number | string;
  /** Optional additional CSS class names. */
  className?: string;
  /** Optional inline styles. */
  style?: React.CSSProperties;
}

/**
 * Properties accepted by the MacFileIcon component.
 */
export interface MacFileIconProps {
  /** File extension (with or without leading dot). */
  extension?: string;
  /** Dimension size in pixels or CSS units. Defaults to 28. */
  size?: number | string;
  /** Optional additional CSS class names. */
  className?: string;
  /** Optional inline styles. */
  style?: React.CSSProperties;
}

/**
 * Resolves a file extension string to its matching macOS visual badge category.
 *
 * @param extension - The file extension string, e.g. "png", ".ts", "PDF".
 * @returns The resolved MacFileCategory identifier.
 */
export function getFileCategory(extension?: string): MacFileCategory {
  if (!extension) return "default";
  const ext = extension.replace(/^\./, "").trim().toLowerCase();

  switch (ext) {
    case "exe":
    case "msi":
    case "bat":
    case "cmd":
      return "binary";

    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "gif":
    case "svg":
      return "photo";

    case "pdf":
      return "pdf";

    case "doc":
    case "docx":
    case "txt":
    case "md":
      return "document";

    case "xls":
    case "xlsx":
    case "csv":
      return "spreadsheet";

    case "mp4":
    case "mkv":
    case "mov":
    case "avi":
      return "video";

    case "mp3":
    case "wav":
    case "flac":
      return "audio";

    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "rs":
    case "py":
    case "html":
    case "css":
    case "json":
      return "code";

    case "zip":
    case "rar":
    case "7z":
    case "tar":
      return "archive";

    default:
      return "default";
  }
}

/**
 * Renders an authentic macOS Big Sur/Sonoma-style blue folder icon.
 * Features the signature top-left rounded tab, radiant Apple sky-to-royal-blue
 * gradient (#5ac8fa to #1370d6), specular rim highlight, and soft natural elevation.
 *
 * @param props - Folder icon configuration options.
 * @returns Rendered SVG folder element.
 */
export const MacFolderIcon: React.FC<MacFolderIconProps> = ({
  size = 28,
  className = "",
  style,
}) => {
  const rawId = useId();
  // Strip colons from useId to produce clean, valid SVG ID strings
  const id = `mac-folder-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        {/* Apple radiant blue front flap gradient */}
        <linearGradient id={`${id}-front`} x1="32" y1="21.5" x2="32" y2="55.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5ac8fa" />
          <stop offset="28%" stopColor="#3ca2f5" />
          <stop offset="100%" stopColor="#136ed4" />
        </linearGradient>

        {/* Deep blue back cavity and tab gradient */}
        <linearGradient id={`${id}-back`} x1="32" y1="12" x2="32" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2582e8" />
          <stop offset="100%" stopColor="#1155a6" />
        </linearGradient>

        {/* Soft specular sheen overlay for the top of the flap */}
        <linearGradient id={`${id}-sheen`} x1="32" y1="21.5" x2="32" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Tactile elevation drop shadow */}
        <filter id={`${id}-shadow`} x="-12%" y="-5%" width="124%" height="135%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.8" floodColor="#073262" floodOpacity="0.38" />
        </filter>
      </defs>

      {/* ── 1. Back Tab & Rear Folder Plate ── */}
      <path
        d="M 6.5 18 C 6.5 14.5 8.5 12.5 12 12.5 L 24 12.5 C 26.8 12.5 28.6 13.8 30.5 16 C 32 17.7 33.8 18.5 36 18.5 L 54.5 18.5 C 57.5 18.5 59.5 20.5 59.5 23.5 L 59.5 49 C 59.5 52 57.5 54 54.5 54 L 9.5 54 C 6.5 54 4.5 52 4.5 49 L 4.5 23 C 4.5 20.2 5.5 18 6.5 18 Z"
        fill={`url(#${id}-back)`}
      />

      {/* ── 2. Subtle Interior Cavity Shade ── */}
      <path
        d="M 6 22 L 58 22"
        stroke="#0d4684"
        strokeWidth="1.6"
        strokeOpacity="0.4"
      />

      {/* ── 3. Front Folder Flap (Smooth Rounded Rectangle) ── */}
      <rect
        x="4.5"
        y="21.5"
        width="55"
        height="34"
        rx="5.5"
        fill={`url(#${id}-front)`}
        filter={`url(#${id}-shadow)`}
      />

      {/* ── 4. Upper Half Subtle Gloss Sheen ── */}
      <rect
        x="4.5"
        y="21.5"
        width="55"
        height="14"
        rx="5.5"
        fill={`url(#${id}-sheen)`}
      />

      {/* ── 5. Crisp Specular Top-Edge Rim Highlight ── */}
      <path
        d="M 7.5 22.5 L 56.5 22.5"
        stroke="#ffffff"
        strokeWidth="1"
        strokeOpacity="0.55"
        strokeLinecap="round"
      />

      {/* ── 6. Bottom Edge Ambient Reflected Rim ── */}
      <path
        d="M 8 55 L 56 55"
        stroke="#0c4c94"
        strokeWidth="0.8"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Helper to render the badge graphic tailored to the file's category.
 *
 * @param category - The matched file category.
 * @param id - Unique ID prefix for gradients and clips.
 * @returns An SVG group element with the badge graphics.
 */
function renderFileBadge(category: MacFileCategory, id: string): React.ReactElement {
  switch (category) {
    case "binary":
      // Dark slate/indigo badge with gear symbol
      return (
        <g>
          <rect x="18" y="24" width="28" height="22" rx="4.5" fill="#1e293b" />
          <circle cx="32" cy="35" r="4.5" stroke="#94a3b8" strokeWidth="2.2" fill="none" />
          <circle cx="32" cy="35" r="1.8" fill="#94a3b8" />
          {/* Cardinal teeth */}
          <rect x="31.1" y="28" width="1.8" height="2.5" rx="0.5" fill="#94a3b8" />
          <rect x="31.1" y="39.5" width="1.8" height="2.5" rx="0.5" fill="#94a3b8" />
          <rect x="25" y="34.1" width="2.5" height="1.8" rx="0.5" fill="#94a3b8" />
          <rect x="36.5" y="34.1" width="2.5" height="1.8" rx="0.5" fill="#94a3b8" />
          {/* Diagonal teeth */}
          <rect x="27.2" y="30.2" width="1.8" height="2" rx="0.5" fill="#94a3b8" transform="rotate(45 28.1 31.2)" />
          <rect x="35" y="38" width="1.8" height="2" rx="0.5" fill="#94a3b8" transform="rotate(45 35.9 39)" />
          <rect x="35" y="30.2" width="1.8" height="2" rx="0.5" fill="#94a3b8" transform="rotate(-45 35.9 31.2)" />
          <rect x="27.2" y="38" width="1.8" height="2" rx="0.5" fill="#94a3b8" transform="rotate(-45 28.1 39)" />
        </g>
      );

    case "photo":
      // Vibrant coral/teal photo icon (landscape mountain & sun)
      return (
        <g>
          <clipPath id={`${id}-photo-clip`}>
            <rect x="18" y="24" width="28" height="22" rx="4.5" />
          </clipPath>
          <g clipPath={`url(#${id}-photo-clip)`}>
            <rect x="18" y="24" width="28" height="22" fill={`url(#${id}-coral-teal)`} />
            {/* Sun */}
            <circle cx="25" cy="30" r="2.8" fill="#fef08a" />
            {/* Background mountain */}
            <polygon points="21,46 28,34 35,46" fill="#14b8a6" fillOpacity="0.85" />
            {/* Foreground mountain peak */}
            <polygon points="28,46 36,31 45,46" fill="#0f766e" />
          </g>
        </g>
      );

    case "pdf":
      // Red document badge with bold "PDF"
      return (
        <g>
          <rect x="18" y="24" width="28" height="22" rx="4.5" fill="#dc2626" />
          <text
            x="32"
            y="38.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="9.5"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.6"
          >
            PDF
          </text>
        </g>
      );

    case "document":
      // Blue text document with lines
      return (
        <g>
          <rect x="18" y="24" width="28" height="22" rx="4.5" fill="#2563eb" />
          <line x1="23" y1="30" x2="41" y2="30" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="23" y1="35" x2="41" y2="35" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="23" y1="40" x2="33" y2="40" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );

    case "spreadsheet":
      // Green spreadsheet table badge
      return (
        <g>
          <rect x="18" y="24" width="28" height="22" rx="4.5" fill="#16a34a" />
          <rect x="22" y="28" width="20" height="14" rx="1.5" fill="#15803d" stroke="#ffffff" strokeWidth="1.2" />
          <rect x="22" y="28" width="20" height="4.5" rx="1.5" fill="#86efac" fillOpacity="0.4" />
          <line x1="22" y1="35" x2="42" y2="35" stroke="#ffffff" strokeWidth="1" />
          <line x1="32" y1="28" x2="32" y2="42" stroke="#ffffff" strokeWidth="1" />
        </g>
      );

    case "video":
      // Purple video clapper / play badge
      return (
        <g>
          <rect x="18" y="24" width="28" height="22" rx="4.5" fill="#7c3aed" />
          {/* Top clapper strip */}
          <rect x="18" y="24" width="28" height="4.5" fill="#5b21b6" rx="1" />
          <line x1="24" y1="24" x2="26" y2="28.5" stroke="#ffffff" strokeWidth="1" />
          <line x1="32" y1="24" x2="34" y2="28.5" stroke="#ffffff" strokeWidth="1" />
          <line x1="40" y1="24" x2="42" y2="28.5" stroke="#ffffff" strokeWidth="1" />
          {/* Centered play triangle */}
          <polygon points="29,31 38,36 29,41" fill="#ffffff" />
        </g>
      );

    case "audio":
      // Magenta/hot pink music note badge
      return (
        <g>
          <rect x="18" y="24" width="28" height="22" rx="4.5" fill="#db2777" />
          <ellipse cx="26" cy="40" rx="2.5" ry="2" fill="#ffffff" transform="rotate(-20 26 40)" />
          <ellipse cx="34" cy="38" rx="2.5" ry="2" fill="#ffffff" transform="rotate(-20 34 38)" />
          <line x1="28" y1="39.5" x2="28" y2="29.5" stroke="#ffffff" strokeWidth="1.6" />
          <line x1="36" y1="37.5" x2="36" y2="27.5" stroke="#ffffff" strokeWidth="1.6" />
          <polygon points="27.2,30.5 36.8,28.5 36.8,31.5 27.2,33.5" fill="#ffffff" />
        </g>
      );

    case "code":
      // Cyan/emerald code { } symbol
      return (
        <g>
          <rect x="18" y="24" width="28" height="22" rx="4.5" fill="#0d9488" />
          <text
            x="32"
            y="39.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="13"
            fontWeight="700"
            fontFamily="Consolas, Monaco, monospace"
          >
            &#123; &#125;
          </text>
        </g>
      );

    case "archive":
      // Amber archive zipper badge
      return (
        <g>
          <rect x="18" y="24" width="28" height="22" rx="4.5" fill="#d97706" />
          <line x1="32" y1="26" x2="32" y2="44" stroke="#78350f" strokeWidth="2.4" />
          <rect x="29" y="27" width="3" height="1.6" rx="0.4" fill="#ffffff" />
          <rect x="32" y="30" width="3" height="1.6" rx="0.4" fill="#ffffff" />
          <rect x="29" y="33" width="3" height="1.6" rx="0.4" fill="#ffffff" />
          <rect x="29" y="36.5" width="6" height="5.5" rx="1.5" fill="#fef3c7" stroke="#78350f" strokeWidth="0.8" />
          <circle cx="32" cy="39" r="1.1" fill="#78350f" />
        </g>
      );

    case "default":
    default:
      // Neat document lines directly on sheet
      return (
        <g stroke="#94a3b8" strokeLinecap="round">
          <line x1="18" y1="24" x2="34" y2="24" strokeWidth="2.2" />
          <line x1="18" y1="30" x2="44" y2="30" strokeWidth="2.2" />
          <line x1="18" y1="36" x2="44" y2="36" strokeWidth="2.2" />
          <line x1="18" y1="42" x2="38" y2="42" strokeWidth="2.2" />
          <line x1="18" y1="48" x2="28" y2="48" strokeWidth="2.2" />
        </g>
      );
  }
}

/**
 * Renders an authentic macOS-style document card with a clean rounded sheet,
 * dog-eared folded top-right corner, and an extension-tailored badge in the center.
 *
 * @param props - Document file icon configuration options.
 * @returns Rendered SVG file card element.
 */
export const MacFileIcon: React.FC<MacFileIconProps> = ({
  extension,
  size = 28,
  className = "",
  style,
}) => {
  const rawId = useId();
  const id = `mac-file-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const category = getFileCategory(extension);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        {/* Soft shadow for the entire document card */}
        <filter id={`${id}-shadow`} x="-15%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.18" />
        </filter>

        {/* Gradient for folded dog-ear corner */}
        <linearGradient id={`${id}-fold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        {/* Vibrant coral-to-teal gradient for photo badges */}
        <linearGradient id={`${id}-coral-teal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>

      {/* Main document card body with cut corner at top-right */}
      <path
        d="M 14 6 L 40 6 L 54 20 L 54 54 A 4 4 0 0 1 50 58 L 14 58 A 4 4 0 0 1 10 54 L 10 10 A 4 4 0 0 1 14 6 Z"
        fill="#ffffff"
        stroke="#cbd5e1"
        strokeWidth="1"
        filter={`url(#${id}-shadow)`}
      />

      {/* Fold shadow beneath the dog-ear flap */}
      <polygon points="40,20 38,22 52,22 54,20" fill="#000000" fillOpacity="0.1" />

      {/* Dog-eared folded corner */}
      <path
        d="M 40 6 L 40 18 A 2 2 0 0 0 42 20 L 54 20 Z"
        fill={`url(#${id}-fold)`}
        stroke="#cbd5e1"
        strokeWidth="0.8"
      />

      {/* Extension-tailored center badge */}
      {renderFileBadge(category, id)}

      {/* Subtle document line underneath badges for realistic paper look */}
      {category !== "default" && (
        <line
          x1="18"
          y1="51"
          x2="46"
          y2="51"
          stroke="#e2e8f0"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};

/**
 * Properties accepted by the MacDriveIcon component.
 */
export interface MacDriveIconProps {
  /** Dimension size in pixels or CSS units. Defaults to 20. */
  size?: number | string;
  /** Optional additional CSS class names. */
  className?: string;
  /** Optional inline styles. */
  style?: React.CSSProperties;
}

/**
 * Renders a faithful macOS Macintosh HD / internal SSD drive icon.
 * Features brushed aluminum silver gradient, top-edge specular highlight,
 * drive enclosure bevel, and soft power/activity indicator.
 *
 * @param props - Custom size, classes, or styles.
 * @returns SVG element representing the Macintosh drive.
 */
export const MacDriveIcon: React.FC<MacDriveIconProps> = ({
  size = 20,
  className = "",
  style,
}) => {
  const rawId = useId();
  const id = `mac-drive-${rawId.replace(/:/g, "")}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ verticalAlign: "middle", ...style }}
      aria-label="Macintosh HD"
    >
      <defs>
        {/* Brushed aluminum enclosure gradient */}
        <linearGradient id={`${id}-body`} x1="0" y1="12" x2="0" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="40%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Top-edge specular highlight */}
        <linearGradient id={`${id}-bevel`} x1="0" y1="12" x2="64" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
        </linearGradient>

        {/* Front slot / faceplate gradient */}
        <linearGradient id={`${id}-slot`} x1="0" y1="36" x2="0" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Drop shadow */}
        <filter id={`${id}-shadow`} x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Main drive metallic chassis */}
      <rect
        x="6"
        y="14"
        width="52"
        height="36"
        rx="6"
        fill={`url(#${id}-body)`}
        stroke="#64748b"
        strokeWidth="1.2"
        filter={`url(#${id}-shadow)`}
      />

      {/* Top bevel highlight line */}
      <line
        x1="12"
        y1="16"
        x2="52"
        y2="16"
        stroke={`url(#${id}-bevel)`}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Front darker faceplate section */}
      <rect
        x="10"
        y="32"
        width="44"
        height="12"
        rx="3"
        fill={`url(#${id}-slot)`}
        stroke="#0f172a"
        strokeWidth="0.8"
      />

      {/* Optical/Drive slot */}
      <line
        x1="16"
        y1="38"
        x2="42"
        y2="38"
        stroke="#475569"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Apple LED Activity light */}
      <circle cx="48" cy="38" r="2" fill="#38bdf8" />
      <circle cx="48" cy="38" r="3.5" fill="#38bdf8" fillOpacity="0.3" />
    </svg>
  );
};

export default {
  MacFolderIcon,
  MacFileIcon,
  MacDriveIcon,
  getFileCategory,
};
