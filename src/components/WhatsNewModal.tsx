import React, { useState, useEffect } from "react";
import { FoldyLogo } from "./FoldyLogo";

/**
 * Storage key used to persist the last version of Foldy seen by the user.
 */
export const WHATS_NEW_LAST_VERSION_KEY = "foldy_last_seen_version";

/** Current active release version string of Foldy. */
export const APP_CURRENT_VERSION = "0.1.4";

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
        tagColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        description:
          "Integrated the Tauri custom asset protocol with expanded OS security scopes, enabling instant playback of MP4 and WebM videos and crisp rendering of all photo formats.",
        tip: "Press 'P' or 'Space' on any video or image to inspect immediately.",
      },
      {
        icon: "📄",
        title: "Interactive PDF Canvas Viewer",
        tag: "NEW VIEWER",
        tagColor: "bg-red-500/20 text-red-400 border-red-500/30",
        description:
          "High-performance PDF rendering directly to HTML5 canvas with interactive page flipping, zoom levels (+ / - / reset), and zero WebView2 CSP sandboxing friction.",
      },
      {
        icon: "📝",
        title: "Native Word Document (.docx) Viewer",
        tag: "NEW VIEWER",
        tagColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        description:
          "Instant parsing and clean HTML sheet rendering for Microsoft Word documents with live word and character counters, plus a 1-click 'Open in Word' shortcut.",
      },
      {
        icon: "🔄",
        title: "Over-the-Air Live Auto-Updater",
        tag: "UPDATER",
        tagColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
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
        tagColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        description:
          "Press 'P' or 'Space' on any file or folder to preview photos, stream full-length videos, play audio with live waveform animations, view syntax-formatted code with line numbers, open PDFs, or inspect folder contents without launching heavy external apps.",
        tip: "Keyboard shortcut: Press 'P' or 'Space' to preview, Left / Right arrows to cycle through items, and Escape to close.",
      },
      {
        icon: "🎨",
        title: "5 Lovable Themes with Poetic Names",
        tag: "NEW DESIGN",
        tagColor: "bg-pink-500/20 text-pink-400 border-pink-500/30",
        description:
          "Personalize your workspace with five lovable new theme identities: Midnight Sakura (OLED), Blush Cotton Candy, Google Pixel Horizon, Cupertino Silver & Multicolor, and Solar Sunset (Matte Orange).",
        tip: "Switch themes anytime under Preferences (⚙️) or in the header bar.",
      },
      {
        icon: "⚡",
        title: "Zero-Lag Startup Directory Pre-Warming",
        tag: "PERFORMANCE",
        tagColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        description:
          "A lightweight background worker pre-warms your primary user libraries (Downloads, Desktop, Documents, and Pictures) on startup without blocking the UI thread, completely eliminating initial loading delays.",
      },
      {
        icon: "💾",
        title: "Real-Time APFS & NTFS Storage Visualizer",
        tag: "STORAGE",
        tagColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        description:
          "Live drive capacity visualization for internal and external volumes across macOS (APFS) and Windows (NTFS), reporting real-time used percentage, free gigabytes, and total disk size.",
      },
      {
        icon: "🛡️",
        title: "Safety & Quality Assurance (ISO/IEC 25010)",
        tag: "SECURITY",
        tagColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        description:
          "Protected system path barriers prohibit accidental deletion of drive roots and OS directories (Windows, System32, Program Files, /System). Includes command-injection immunity via native ShellExecuteW and transactional undo history.",
      },
      {
        icon: "🎓",
        title: "Interactive Guided Tour & Cheat Sheet",
        tag: "DOCUMENTATION",
        tagColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
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
        tagColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        description:
          "Search for any file or directory across your entire computer using the Spotlight-style command palette (`Ctrl+K` or `⌘K`).",
      },
      {
        icon: "📑",
        title: "Browser-Style Tabbed Browsing",
        tag: "PRODUCTIVITY",
        tagColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        description:
          "Open multiple explorer tabs simultaneously (`Ctrl+T` / `⌘T`), reorder them with drag and drop, and close active tabs with `Ctrl+W` / `⌘W`.",
      },
      {
        icon: "🔄",
        title: "1-Click Undo for Bulk Renaming",
        tag: "SAFETY",
        tagColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div className="relative w-full max-w-2xl bg-card border border-neutral-800/80 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-primary-color">
        {/* Header Ribbon Banner */}
        <div className="relative p-6 pb-5 border-b border-neutral-800/50 bg-gradient-to-r from-neutral-900/90 via-neutral-900/60 to-neutral-900/90">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-2xl bg-neutral-800/60 border border-neutral-700/40 shadow-inner flex items-center justify-center">
                <FoldyLogo size={34} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="whats-new-title" className="text-lg font-black tracking-tight text-primary-color">
                    What's New in Foldy
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ff2d87]/20 text-[#ff2d87] border border-[#ff2d87]/30 tracking-wide uppercase">
                    v{activeRelease.version}
                  </span>
                </div>
                <p className="text-xs text-muted-color mt-0.5">
                  {activeRelease.title} • {activeRelease.date}
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-color hover:text-primary-color hover:bg-neutral-800/50 text-sm transition-all active:scale-95"
              aria-label="Close What's New modal"
            >
              ✕
            </button>
          </div>

          {/* Version Switcher Tabs */}
          {CHANGELOG_DATA.length > 1 && (
            <div className="flex items-center gap-1.5 mt-4 pt-2 border-t border-neutral-800/30">
              {CHANGELOG_DATA.map((rel) => {
                const isSelected = rel.version === selectedVersion;
                const isCurrent = rel.version === currentVersion;
                return (
                  <button
                    key={rel.version}
                    onClick={() => setSelectedVersion(rel.version)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#ff2d87] text-white shadow-md shadow-[#ff2d87]/25"
                        : "bg-neutral-800/40 text-muted-color hover:text-primary-color hover:bg-neutral-800/70"
                    }`}
                  >
                    <span>v{rel.version}</span>
                    {isCurrent && (
                      <span className="text-[9px] px-1 py-0.2 rounded-md bg-white/20 font-bold uppercase">
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
        <div className="p-6 overflow-y-auto space-y-3.5 max-h-[58vh]">
          {activeRelease.highlights.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800/60 hover:border-neutral-700/60 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <h3 className="text-xs font-bold text-primary-color">
                    {item.title}
                  </h3>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md border tracking-wider uppercase shrink-0 ${item.tagColor}`}
                >
                  {item.tag}
                </span>
              </div>

              <p className="text-xs text-muted-color leading-relaxed pl-7">
                {item.description}
              </p>

              {item.tip && (
                <div className="ml-7 mt-2 p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/40 text-[11px] text-muted-color flex items-center gap-2">
                  <span className="text-xs">💡</span>
                  <span className="font-mono text-[10px] text-primary-color/90">{item.tip}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 px-6 border-t border-neutral-800/50 bg-neutral-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-color">
            <span>✨</span>
            <span className="text-[11px]">Foldy for macOS and Windows</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTutorials && (
              <button
                onClick={handleOpenTour}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-color hover:text-primary-color hover:bg-neutral-800/60 transition-all border border-neutral-800"
              >
                🎓 View Guided Tour
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="px-5 py-2 rounded-xl bg-[#ff2d87] hover:bg-[#e61b74] active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-[#ff2d87]/25 flex items-center gap-1.5"
            >
              <span>Explore Foldy</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
