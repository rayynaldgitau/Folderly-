import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

const baseProps = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
});

export const IconFolder: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  </svg>
);

export const IconFolderPlus: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    <path d="M12 11v4M10 13h4" />
  </svg>
);

export const IconFile: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </svg>
);

export const IconSearch: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconClose: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconCheck: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconUndo: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

export const IconArrowLeft: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const IconArrowRight: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export const IconArrowUp: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export const IconArrowDown: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);

export const IconRefresh: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);

export const IconSidebar: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </svg>
);

export const IconSettings: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const IconSparkles: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
    <path d="M5 17l.9 2.1L8 20l-2.1.9L5 23l-.9-2.1L2 20l2.1-.9L5 17z" />
  </svg>
);

export const IconAlert: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const IconSliders: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
  </svg>
);

export const IconEye: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconGrid: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

export const IconList: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

export const IconPin: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);

export const IconPlus: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconHelp: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
  </svg>
);

export const IconDownload: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

export const IconTrash: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

export const IconExternalLink: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

export const IconChevronRight: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const IconClock: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconMoreVert: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <circle cx="12" cy="5" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1.25" fill="currentColor" stroke="none" />
  </svg>
);

export const IconHardDrive: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 14h18" />
    <circle cx="7" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
  </svg>
);

export const IconChevronDown: React.FC<IconProps> = ({ size = 16, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconPencil: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const IconFolderMove: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg {...baseProps(size)} {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    <path d="m10 13 4 0m-2-2 2 2-2 2" />
  </svg>
);
