import React, { useState, useEffect } from "react";
import { FoldyLogo } from "./FoldyLogo";

/**
 * Storage key used to persist the last version of Foldy seen by the user.
 */
export const WHATS_NEW_LAST_VERSION_KEY = "foldy_last_seen_version";

/** Current active release version string of Foldy. */
export const APP_CURRENT_VERSION = "0.1.6";

/**
 * Feature change entry detailing a specific improvement or addition.
 */
export interface FeatureHighlight {
  /** Emoji or icon badge representing the feature. */
  icon: string;
  /** Short headline of the new capability. */
  title: string;
  /** Category badge text (e.g. "NEW FEATURE", "PERFORMANCE", "SAFETY"). */
  tag: string;
  /** Badge color styling class. */
  tagColor: string;
  /** Plain text or markdown description explaining the feature and how to use it. */
  description: string;
  /** Optional keyboard shortcut or usage tip. */
  tip?: string;
}

/**
 * Release changelog data entry for a specific version.
 */
export interface ReleaseVersion {
  version: string;
  title: string;
  date: string;
  highlights: FeatureHighlight[];
}

/**
 * Historical changelog data for Foldy releases.
 */
export const CHANGELOG_DATA: ReleaseVersion[] = [
  {
    version: "0.1.4",
    title: "Media & Document Preview Fix + Live Update Delivery",
    date: "October 2026",
    highlights: [
      {
        icon: "🎬",
        title: "Seamless Video & Photo Rendering",
        tag: "FIX & IMPROVEMENT",
        tagColor: "bg-tertiary-container text-on-tertiary-container border-outline-variant",
        description:
          "Integrated the Tauri custom asset protocol with expanded OS security scopes, enabling instant playback of MP4 and WebM videos and crisp rendering of all photo formats.",
        tip: "Press 'P' or 'Space' on any video or image to inspect immediately.",
      },
      {
        icon: "📄",
        title: "Interactive PDF Canvas Viewer",
        tag: "NEW VIEWER",
        tagColor: "bg-error-container text-on-error-container border-outline-variant",
        description:
          "High-performance PDF rendering directly to HTML5 canvas with interactive page flipping, zoom levels (+ / - / reset), and zero WebView2 CSP sandboxing friction.",
      },
      {
        icon: "📝",
        title: "Native Word Document (.docx) Viewer",
        tag: "NEW VIEWER",
        tagColor: "bg-primary-container text-on-primary-container border-outline-variant",
        description:
          "Instant parsing and clean HTML sheet rendering for Microsoft Word documents with live word and character counters, plus a 1-click 'Open in Word' shortcut.",
      },
      {
        icon: "🔄",
        title: "Over-the-Air Live Auto-Updater",
        tag: "UPDATER",
        tagColor: "bg-success-container text-on-success-container border-outline-variant",
        description:
          "Automated update delivery across Windows and macOS with dual target resolution, cryptographic verification, and one-click in-app background installation.",
      },
    ],
  },
  {
    version: "0.1.3",
    title: "Quick Look Preview, What's New & Lovable Themes Update",
    date: "October 2026",
    highlights: [
      {
        icon: "👁️",
        title: "Instant Quick Look Preview",
        tag: "NEW FEATURE",
        tagColor: "bg-primary-container text-on-primary-container border-outline-variant",
        description:
          "Press 'P' or 'Space' on any file or folder to preview photos, stream full-length videos, play audio with live waveform animations, view syntax-formatted code with line numbers, open PDFs, or inspect folder contents without launching heavy external apps.",
        tip: "Keyboard shortcut: Press 'P' or 'Space' to preview, Left / Right arrows to cycle through items, and Escape to close.",
      },
      {
        icon: "🎨",
        title: "5 Lovable Themes with Poetic Names",
        tag: "NEW DESIGN",
        tagColor: "bg-secondary-container text-on-secondary-container border-outline-variant",
        description:
          "Personalize your workspace with five lovable new theme identities: Midnight Sakura (OLED), Blush Cotton Candy, Google Pixel Horizon, Cupertino Silver & Multicolor, and Solar Sunset (Matte Orange).",
        tip: "Switch themes anytime under Preferences (⚙️) or in the header bar.",
      },
      {
        icon: "⚡",
        title: "Zero-Lag Startup Directory Pre-Warming",
        tag: "PERFORMANCE",
        tagColor: "bg-warning-container text-on-warning-container border-outline-variant",
        description:
          "A lightweight background worker pre-warms your primary user libraries (Downloads, Desktop, Documents, and Pictures) on startup without blocking the UI thread, completely eliminating initial loading delays.",
      },
      {
        icon: "💾",
        title: "Real-Time APFS & NTFS Storage Visualizer",
        tag: "STORAGE",
        tagColor: "bg-success-container text-on-success-container border-outline-variant",
        description:
          "Live drive capacity visualization for internal and external volumes across macOS (APFS) and Windows (NTFS), reporting real-time used percentage, free gigabytes, and total disk size.",
      },
      {
        icon: "🛡️",
        title: "Safety & Quality Assurance (ISO/IEC 25010)",
        tag: "SECURITY",
        tagColor: "bg-tertiary-container text-on-tertiary-container border-outline-variant",
        description:
          "Protected system path barriers prohibit accidental deletion of drive roots and OS directories (Windows, System32, Program Files, /System). Includes command-injection immunity via native ShellExecuteW and transactional undo history.",
      },
      {
        icon: "🎓",
        title: "Interactive Guided Tour & Cheat Sheet",
        tag: "DOCUMENTATION",
        tagColor: "bg-secondary-container text-on-secondary-container border-outline-variant",
        description:
          "New 6-slide interactive onboarding walkthrough and keyboard shortcuts reference matrix accessible from Settings or the Help menu.",
      },
    ],
  },
  {
    version: "0.1.1",
    title: "Universal Laptop Search & Multi-Tab Browsing",
    date: "October 2026",
    highlights: [
      {
        icon: "🔍",
        title: "Universal Laptop Search",
        tag: "FEATURE",
        tagColor: "bg-primary-container text-on-primary-container border-outline-variant",
        description:
          "Search for any file or directory across your entire computer using the Spotlight-style command palette (`Ctrl+K` or `⌘K`).",
      },
      {
        icon: "📑",
        title: "Browser-Style Tabbed Browsing",
        tag: "PRODUCTIVITY",
        tagColor: "bg-success-container text-on-success-container border-outline-variant",
        description:
          "Open multiple explorer tabs simultaneously (`Ctrl+T` / `⌘T`), reorder them with drag and drop, and close active tabs with `Ctrl+W` / `⌘W`.",
      },
      {
        icon: "🔄",
        title: "1-Click Undo for Bulk Renaming",
        tag: "SAFETY",
        tagColor: "bg-tertiary-container text-on-tertiary-container border-outline-variant",
        description:
          "Easily reverse accidental bulk renames with a single click or `Ctrl+Z` / `⌘Z` using the persistent disk undo journal.",
      },
    ],
  },
];

/**
 * Properties accepted by the {@link WhatsNewModal} component.
 */
export interface WhatsNewModalProps {
  /** Whether the modal is currently visible. */
  isOpen: boolean;
  /** Callback invoked to close the modal. */
  onClose: () => void;
  /** Optional callback to open the interactive tutorial modal. */
  onOpenTutorials?: () => void;
  /** Optional current app version override (defaults to {@link APP_CURRENT_VERSION}). */
  currentVersion?: string;
}

/**
 * "What's New" Popup Modal for Foldy.
 *
 * Automatically pops up when a new version or update of Foldy is launched on macOS or Windows,
 * giving users an attractive, clear summary of new features, performance boosts, and safety updates.
 *
 * @param props - Component parameters.
 * @returns React modal element or null.
 */
export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  isOpen,
  onClose,
  onOpenTutorials,
  currentVersion = APP_CURRENT_VERSION,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string>(currentVersion);

  // Synchronize selected tab whenever currentVersion prop changes
  useEffect(() => {
    setSelectedVersion(currentVersion);
  }, [currentVersion]);

  // Handle keyboard Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * Dismisses the modal and permanently records that the user has seen the current version.
   */
  const handleDismiss = () => {
    try {
      localStorage.setItem(WHATS_NEW_LAST_VERSION_KEY, currentVersion);
    } catch {
      // Ignore localStorage write failure in restricted environments
    }
    onClose();
  };

  /**
   * Opens the interactive tutorial and closes the What's New modal.
   */
  const handleOpenTour = () => {
    handleDismiss();
    if (onOpenTutorials) {
      onOpenTutorials();
    }
  };

  const activeRelease =
    CHANGELOG_DATA.find((r) => r.version === selectedVersion) || CHANGELOG_DATA[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div className="relative w-full max-w-2xl bg-surface-container-high rounded-m3-xl shadow-m3-3 flex flex-col max-h-[90vh] overflow-hidden text-on-surface animate-m3-dialog">
        {/* Header */}
        <div className="relative p-6 pb-5 bg-surface-container">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-2 rounded-m3-md bg-surface-container-high flex items-center justify-center">
                <FoldyLogo size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="whats-new-title" className="text-lg font-semibold tracking-tight text-on-surface">
                    What&apos;s New in Foldy
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-m3-full text-[11px] font-semibold bg-primary-container text-on-primary-container">
                    v{activeRelease.version}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {activeRelease.title} • {activeRelease.date}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-10 h-10 rounded-m3-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest text-sm m3-pressable"
              aria-label="Close What's New modal"
            >
              ✕
            </button>
          </div>

          {CHANGELOG_DATA.length > 1 && (
            <div className="flex items-center gap-2 mt-4 pt-2">
              {CHANGELOG_DATA.map((rel) => {
                const isSelected = rel.version === selectedVersion;
                const isCurrent = rel.version === currentVersion;
                return (
                  <button
                    key={rel.version}
                    type="button"
                    onClick={() => setSelectedVersion(rel.version)}
                    className={`px-3.5 min-h-[36px] rounded-m3-full text-xs font-medium m3-pressable flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span>v{rel.version}</span>
                    {isCurrent && (
                      <span className="text-[10px] opacity-80 font-semibold uppercase">
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Feature Highlights List */}
        <div className="p-6 overflow-y-auto space-y-3 max-h-[58vh]">
          {activeRelease.highlights.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-m3-md bg-surface-container space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-on-surface">
                  {item.title}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-m3-full bg-secondary-container text-on-secondary-container uppercase shrink-0">
                  {item.tag}
                </span>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                {item.description}
              </p>

              {item.tip && (
                <div className="mt-2 p-2.5 rounded-m3-sm bg-surface-container-low text-[11px] text-on-surface-variant font-mono">
                  {item.tip}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 px-6 bg-surface-container flex items-center justify-between gap-3">
          <span className="text-xs text-on-surface-variant">
            Foldy for macOS and Windows
          </span>

          <div className="flex items-center gap-2">
            {onOpenTutorials && (
              <button
                type="button"
                onClick={handleOpenTour}
                className="px-4 min-h-[40px] rounded-m3-full text-xs font-medium text-primary border border-outline hover:bg-primary/10 m3-pressable"
              >
                View Guided Tour
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="px-5 min-h-[40px] rounded-m3-full bg-primary text-on-primary text-xs font-medium m3-pressable"
            >
              Explore Foldy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
