import React, { useState, useEffect, useCallback } from "react";
import { FoldyLogo } from "./FoldyLogo";

/**
 * Storage key used to persist the user's preference for startup onboarding.
 */
export const TUTORIAL_HIDE_KEY = "foldy_hide_tutorial";

/**
 * Properties accepted by the {@link TutorialModal} component.
 */
export interface TutorialModalProps {
  /** Whether the tutorial onboarding modal is currently visible. */
  isOpen: boolean;
  /** Callback invoked to dismiss or close the tutorial modal. */
  onClose: () => void;
  /** Optional callback fired when the user completes the final slide. */
  onFinishTutorial?: () => void;
}

/** Top navigation categories mapping to slide groups. */
type TutorialCategory = "quick_tour" | "renamer_rules" | "safety_standards" | "shortcuts";

/** Shortcut item definition for the cheat sheet. */
interface ShortcutEntry {
  keys: string[];
  action: string;
  category: "Navigation" | "Tabs" | "Renamer & Files" | "General";
}

/**
 * Returns the keyboard shortcuts list adapted dynamically for macOS or Windows.
 *
 * @param isMac - Whether the host operating system is macOS.
 * @returns Array of ShortcutEntry objects with matching modifier keys.
 */
function getShortcutsList(isMac: boolean): ShortcutEntry[] {
  const mod = isMac ? "⌘" : "Ctrl";
  const opt = isMac ? "⌥" : "Alt";

  return [
    { keys: [mod, "K"], action: "Open Universal Search modal", category: "Navigation" },
    { keys: [opt, "←"], action: "Navigate back in folder history", category: "Navigation" },
    { keys: [opt, "→"], action: "Navigate forward in folder history", category: "Navigation" },
    { keys: [opt, "↑"], action: "Navigate up to parent directory", category: "Navigation" },
    { keys: [isMac ? "⌘ R" : "F5"], action: "Refresh current directory contents", category: "Navigation" },
    { keys: [mod, "T"], action: "Open a new directory browser tab", category: "Tabs" },
    { keys: [mod, "W"], action: "Close current active tab", category: "Tabs" },
    { keys: [mod, "Tab"], action: "Switch to next adjacent tab", category: "Tabs" },
    { keys: [mod, "R"], action: "Toggle safe bulk renamer drawer", category: "Renamer & Files" },
    { keys: [mod, "Z"], action: "1-Click undo last bulk rename operation", category: "Renamer & Files" },
    { keys: [mod, "A"], action: "Select all files in current view", category: "Renamer & Files" },
    { keys: [isMac ? "⌫ Delete" : "Delete"], action: "Move selected file(s) to Trash / Recycle Bin", category: "Renamer & Files" },
    { keys: ["Esc"], action: "Close modals or clear file selection", category: "General" },
    { keys: ["←", "→"], action: "Navigate previous / next tutorial slide", category: "General" },
  ];
}

/**
 * Interactive Onboarding and Feature Documentation Modal for Foldy.
 *
 * Provides a 6-step guided walkthrough highlighting privacy guarantees,
 * multi-tab navigation, drag-and-drop file organization, atomic bulk renaming,
 * ISO/IEC 25010 software quality compliance, and keyboard shortcuts cheat sheet.
 *
 * @param props - Dialog visibility state and close/completion callbacks.
 * @returns An accessible modal overlay containing the interactive guide.
 */
export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onFinishTutorial,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [shortcutFilter, setShortcutFilter] = useState("");
  const TOTAL_STEPS = 6;

  // Initialize the "don't show again" checkbox value from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem(TUTORIAL_HIDE_KEY);
        setDontShowAgain(stored === "true");
      } catch {
        // Fallback gracefully if localStorage is unavailable
      }
    }
  }, [isOpen]);

  /**
   * Toggles the startup preference and updates local storage persistence.
   *
   * @param checked - The new checkbox state indicating whether to hide on startup.
   */
  const handleToggleDontShowAgain = (checked: boolean) => {
    setDontShowAgain(checked);
    try {
      if (checked) {
        localStorage.setItem(TUTORIAL_HIDE_KEY, "true");
      } else {
        localStorage.removeItem(TUTORIAL_HIDE_KEY);
      }
    } catch {
      // Storage access failure ignored in sandbox
    }
  };

  /**
   * Advances to the next slide or completes the onboarding flow.
   */
  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      if (onFinishTutorial) {
        onFinishTutorial();
      }
      onClose();
    }
  }, [currentStep, TOTAL_STEPS, onFinishTutorial, onClose]);

  /**
   * Moves to the previous slide in the onboarding flow.
   */
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  /**
   * Handles keyboard navigation (Arrow keys for slides, Escape for dismissal).
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent interfering when user is typing in shortcut search input
      if ((e.target as HTMLElement)?.tagName === "INPUT") {
        if (e.key === "Escape") {
          onClose();
        }
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen) return null;

  /** Resolves the category pill corresponding to the active slide index. */
  const getActiveCategory = (): TutorialCategory => {
    if (currentStep <= 2) return "quick_tour";
    if (currentStep === 3) return "renamer_rules";
    if (currentStep === 4) return "safety_standards";
    return "shortcuts";
  };

  /**
   * Jumps to the primary slide representing a selected category.
   *
   * @param category - Category pill selected by the user.
   */
  const handleSelectCategory = (category: TutorialCategory) => {
    switch (category) {
      case "quick_tour":
        setCurrentStep(0);
        break;
      case "renamer_rules":
        setCurrentStep(3);
        break;
      case "safety_standards":
        setCurrentStep(4);
        break;
      case "shortcuts":
        setCurrentStep(5);
        break;
    }
  };

  const activeCategory = getActiveCategory();

  const isMac =
    typeof navigator !== "undefined" &&
    (navigator.userAgent.includes("Mac") || navigator.platform.includes("Mac"));

  const shortcutsList = getShortcutsList(isMac);

  // Filter shortcuts list on the final slide
  const filteredShortcuts = shortcutsList.filter(
    (s) =>
      s.action.toLowerCase().includes(shortcutFilter.toLowerCase()) ||
      s.category.toLowerCase().includes(shortcutFilter.toLowerCase()) ||
      s.keys.join(" ").toLowerCase().includes(shortcutFilter.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-dialog-title"
    >
      <div className="relative w-full max-w-3xl rounded-3xl bg-card border border-neutral-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-800/60 bg-sidebar/60">
          <div className="flex items-center gap-3">
            <FoldyLogo size={32} interactive={true} />
            <div>
              <h2
                id="tutorial-dialog-title"
                className="text-sm font-bold text-primary-color flex items-center gap-2"
              >
                Foldy Guide &amp; Onboarding
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#ff2d87]/15 text-[#ff2d87] border border-[#ff2d87]/30">
                  Step {currentStep + 1} of {TOTAL_STEPS}
                </span>
              </h2>
              <p className="text-[11px] text-muted-color">
                Interactive walkthrough of tools, safety assurances, and keyboard workflows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close tutorial"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-color hover:text-primary-color hover:bg-neutral-800/60 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Top Category Navigation Pills */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-neutral-800/40 bg-sidebar/30 text-xs overflow-x-auto">
          <button
            onClick={() => handleSelectCategory("quick_tour")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              activeCategory === "quick_tour"
                ? "bg-[#ff2d87] text-white shadow-sm shadow-[#ff2d87]/30"
                : "text-muted-color hover:text-primary-color hover:bg-neutral-800/40"
            }`}
          >
            🚀 Quick Tour (Steps 1–3)
          </button>
          <button
            onClick={() => handleSelectCategory("renamer_rules")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              activeCategory === "renamer_rules"
                ? "bg-[#ff2d87] text-white shadow-sm shadow-[#ff2d87]/30"
                : "text-muted-color hover:text-primary-color hover:bg-neutral-800/40"
            }`}
          >
            ✏️ Safe Bulk Renaming (Step 4)
          </button>
          <button
            onClick={() => handleSelectCategory("safety_standards")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              activeCategory === "safety_standards"
                ? "bg-[#ff2d87] text-white shadow-sm shadow-[#ff2d87]/30"
                : "text-muted-color hover:text-primary-color hover:bg-neutral-800/40"
            }`}
          >
            🛡️ Safety &amp; ISO 25010 (Step 5)
          </button>
          <button
            onClick={() => handleSelectCategory("shortcuts")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              activeCategory === "shortcuts"
                ? "bg-[#ff2d87] text-white shadow-sm shadow-[#ff2d87]/30"
                : "text-muted-color hover:text-primary-color hover:bg-neutral-800/40"
            }`}
          >
            ⌨️ Shortcuts Cheat Sheet (Step 6)
          </button>
        </div>

        {/* Slide Body */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {/* SLIDE 1: WELCOME TO FOLDY */}
          {currentStep === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-sidebar/50 border border-neutral-800/60">
                <div className="relative flex items-center justify-center p-4 rounded-2xl bg-[#ff2d87]/10 border border-[#ff2d87]/20 shrink-0">
                  <FoldyLogo size={64} interactive={true} />
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <h3 className="text-lg font-bold text-primary-color">Welcome to Foldy</h3>
                    <span className="badge badge-green">100% Offline &amp; Private</span>
                  </div>
                  <p className="text-xs text-muted-color leading-relaxed">
                    A desktop file organizer and bulk-renaming suite engineered with Rust and Tauri.
                    Designed for individuals and enterprise teams who demand blazing native performance
                    without compromising on privacy or data sovereignty.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-sidebar/30 border border-neutral-800/50 space-y-2">
                  <div className="text-xl">⚡</div>
                  <h4 className="font-bold text-primary-color">Blazing Native Speed</h4>
                  <p className="text-muted-color leading-relaxed text-[11px]">
                    Direct multi-threaded filesystem indexing. Scans thousands of files and directories
                    in milliseconds with minimal memory footprint.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-sidebar/30 border border-neutral-800/50 space-y-2">
                  <div className="text-xl">🛡️</div>
                  <h4 className="font-bold text-primary-color">Zero Cloud Telemetry</h4>
                  <p className="text-muted-color leading-relaxed text-[11px]">
                    Foldy operates in a closed local sandbox. No data analytics, no cloud uploads, and
                    zero network pings. Your directory tree remains entirely yours.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-sidebar/30 border border-neutral-800/50 space-y-2">
                  <div className="text-xl">🎨</div>
                  <h4 className="font-bold text-primary-color">Tailored Visual Themes</h4>
                  <p className="text-muted-color leading-relaxed text-[11px]">
                    Switch between OLED Deep Pink, Pastel Light, Apple macOS Graphite, Material You,
                    and Midnight Matte themes tailored for comfortable long-session viewing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: BROWSING & TABS */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-primary-color flex items-center gap-2">
                  <span>🧭</span> Seamless Multi-Tab Browsing &amp; Universal Search
                </h3>
                <p className="text-xs text-muted-color">
                  Navigate your filesystem with browser-grade tab management and instant keyboard search.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sidebar/40 border border-neutral-800/60 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-800/40 text-[11px] font-mono text-muted-color">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-card border border-neutral-700/50 text-primary-color">
                    <span>📁</span> <span>Projects</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sidebar text-muted-color">
                    <span>📥</span> <span>Downloads</span>
                  </div>
                  <div className="px-2 py-0.5 rounded-md hover:bg-neutral-800 text-muted-color cursor-pointer">
                    +
                  </div>
                  <div className="ml-auto text-[10px] text-muted-color">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-card border border-neutral-700 text-primary-color font-sans">Ctrl+T</kbd> for new tab
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-primary-color flex items-center gap-1.5">
                      <span>📑</span> Tabbed Workspaces
                    </h4>
                    <p className="text-muted-color text-[11px] leading-relaxed">
                      Keep multiple directories open simultaneously. Duplicate, switch, or close tabs using
                      native shortcuts (<kbd className="px-1 py-0.5 rounded bg-card border border-neutral-700 text-[10px]">Ctrl+W</kbd>).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-primary-color flex items-center gap-1.5">
                      <span>⚡</span> Universal Search (<kbd className="px-1.5 py-0.5 rounded bg-card border border-neutral-700 text-[10px]">Ctrl+K</kbd>)
                    </h4>
                    <p className="text-muted-color text-[11px] leading-relaxed">
                      Instant fuzzy search indexing across filenames, extensions, and subdirectories with
                      instant navigation and file launch shortcuts.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-primary-color flex items-center gap-1.5">
                      <span>💽</span> Drives &amp; Quick Access
                    </h4>
                    <p className="text-muted-color text-[11px] leading-relaxed">
                      Jump immediately to detected drives (C:, D:) and standard system folders (Desktop,
                      Documents, Downloads, Media) with live disk capacity bars.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-primary-color flex items-center gap-1.5">
                      <span>📊</span> Flexible Display Views
                    </h4>
                    <p className="text-muted-color text-[11px] leading-relaxed">
                      Switch effortlessly between visual Grid cards, detailed sortable Table rows, and
                      compact lists to suit any collection of files.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: DRAG & DROP ORGANIZATION */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-primary-color flex items-center gap-2">
                  <span>🎯</span> Intuitive Drag &amp; Drop Organization
                </h3>
                <p className="text-xs text-muted-color">
                  Restructure your files and workspace using fluid desktop gestures.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-sidebar/40 border border-neutral-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-primary-color font-semibold">
                    <span className="p-1.5 rounded-lg bg-[#ff2d87]/15 text-[#ff2d87]">📥</span>
                    Folder Drop Relocation
                  </div>
                  <p className="text-muted-color text-[11px] leading-relaxed">
                    Select single or multiple files from the main grid and drag them directly onto any folder
                    card or directory row. The file move executes immediately via native Rust I/O with
                    error containment.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-sidebar/40 border border-neutral-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-primary-color font-semibold">
                    <span className="p-1.5 rounded-lg bg-[#ff2d87]/15 text-[#ff2d87]">📌</span>
                    Sidebar Quick-Pinning
                  </div>
                  <p className="text-muted-color text-[11px] leading-relaxed">
                    Drag any active project folder onto the Quick Access sidebar section to pin it permanently.
                    Pinned folders stay available across sessions for one-click access.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-sidebar/40 border border-neutral-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-primary-color font-semibold">
                    <span className="p-1.5 rounded-lg bg-[#ff2d87]/15 text-[#ff2d87]">↕️</span>
                    Reorder Pinned Priorities
                  </div>
                  <p className="text-muted-color text-[11px] leading-relaxed">
                    Organize your pinned sidebar folders by dragging items up and down. Your custom order
                    is automatically preserved in local settings.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-sidebar/40 border border-neutral-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-primary-color font-semibold">
                    <span className="p-1.5 rounded-lg bg-[#ff2d87]/15 text-[#ff2d87]">🪟</span>
                    OS Explorer Ingestion
                  </div>
                  <p className="text-muted-color text-[11px] leading-relaxed">
                    Drag files or whole directories directly from Windows Explorer into Foldy to inspect,
                    preview, and reconfigure them on the fly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: SAFE BULK RENAMING */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-primary-color flex items-center gap-2">
                  <span>✏️</span> Safe Bulk Renaming Workflow
                </h3>
                <p className="text-xs text-muted-color">
                  Rule-based transformations with real-time collision detection before touching storage.
                </p>
              </div>

              {/* Step Flow Diagram */}
              <div className="p-4 rounded-2xl bg-sidebar/50 border border-neutral-800/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] text-center">
                  <div className="p-2.5 rounded-xl bg-card border border-neutral-800 space-y-1">
                    <div className="font-bold text-[#ff2d87]">1. Build Rules</div>
                    <p className="text-muted-color text-[10px]">Stack prefix, date, spaces, case, replace</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-neutral-800 space-y-1">
                    <div className="font-bold text-yellow-400">2. Live Preview</div>
                    <p className="text-muted-color text-[10px]">Inspect before/after computed names</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-neutral-800 space-y-1">
                    <div className="font-bold text-emerald-400">3. Safe Commit</div>
                    <p className="text-muted-color text-[10px]">Atomic rename with conflict checks</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-neutral-800 space-y-1">
                    <div className="font-bold text-blue-400">4. 1-Click Undo</div>
                    <p className="text-muted-color text-[10px]">Revert instantly with Ctrl+Z</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-card/60 border border-neutral-800/50 space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-primary-color">
                    Sample Real-Time Preview:
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 rounded-lg bg-neutral-900/40 border border-neutral-800 font-mono text-[11px]">
                    <div className="text-muted-color truncate max-w-xs">
                      DSC_0942 copy (1).JPG
                    </div>
                    <div className="text-[#ff2d87] shrink-0 font-bold">➔</div>
                    <div className="text-emerald-400 font-semibold truncate max-w-xs">
                      2026-10-15_project_0942.jpg
                    </div>
                    <span className="badge badge-green shrink-0">Safe</span>
                  </div>
                </div>

                <p className="text-muted-color text-[11px] leading-relaxed">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-card border border-neutral-700 text-primary-color font-sans">Ctrl+R</kbd> at any time to toggle the Rule Builder drawer.
                  If any generated name would overwrite an existing file, Foldy highlights it in red and
                  disables committing until resolved.
                </p>
              </div>
            </div>
          )}

          {/* SLIDE 5: ISO/IEC 25010 SAFETY & QA */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-primary-color flex items-center gap-2">
                  <span>🛡️</span> International Safety &amp; Quality Assurance (ISO/IEC 25010)
                </h3>
                <p className="text-xs text-muted-color">
                  Engineered to meet rigorous global standards for systems and software product quality.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sidebar/50 border border-neutral-800/60 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-800/40">
                  <span className="badge badge-green text-[10px]">ISO/IEC 25010 Evaluated</span>
                  <span className="text-[11px] text-muted-color">Software Product Quality Model</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1 p-2.5 rounded-xl bg-card border border-neutral-800/40">
                    <h4 className="font-semibold text-primary-color flex items-center gap-1.5">
                      <span>🚫</span> Protected OS Directories
                    </h4>
                    <p className="text-muted-color text-[11px] leading-relaxed">
                      Automatic guard rails strictly forbid batch modifications inside <code className="text-[#ff2d87]">C:\Windows</code>, <code className="text-[#ff2d87]">Program Files</code>,
                      or critical system root paths.
                    </p>
                  </div>

                  <div className="space-y-1 p-2.5 rounded-xl bg-card border border-neutral-800/40">
                    <h4 className="font-semibold text-primary-color flex items-center gap-1.5">
                      <span>📜</span> Non-Destructive Undo Ledger
                    </h4>
                    <p className="text-muted-color text-[11px] leading-relaxed">
                      All filesystem mutation batches are cataloged in an in-memory transactional ledger,
                      enabling instant 100% reversible rollbacks.
                    </p>
                  </div>

                  <div className="space-y-1 p-2.5 rounded-xl bg-card border border-neutral-800/40">
                    <h4 className="font-semibold text-primary-color flex items-center gap-1.5">
                      <span>⚡</span> Reliability &amp; Fault Tolerance
                    </h4>
                    <p className="text-muted-color text-[11px] leading-relaxed">
                      All filesystem interactions are wrapped with isolated ErrorBoundaries and Rust
                      Result checks, preventing app crashes if a disk or network share disconnects.
                    </p>
                  </div>

                  <div className="space-y-1 p-2.5 rounded-xl bg-card border border-neutral-800/40">
                    <h4 className="font-semibold text-primary-color flex items-center gap-1.5">
                      <span>🔒</span> Data Confidentiality &amp; Integrity
                    </h4>
                    <p className="text-muted-color text-[11px] leading-relaxed">
                      Zero tracking libraries, analytics scripts, or telemetry daemons. All operations
                      remain purely local to your device.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 6: KEYBOARD SHORTCUTS CHEAT SHEET */}
          {currentStep === 5 && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-primary-color flex items-center gap-2">
                    <span>⌨️</span> Keyboard Shortcuts Reference
                  </h3>
                  <p className="text-xs text-muted-color">
                    Accelerate your workflow with quick desktop keybindings.
                  </p>
                </div>

                {/* Search Filter for Shortcuts */}
                <div className="relative">
                  <input
                    type="text"
                    value={shortcutFilter}
                    onChange={(e) => setShortcutFilter(e.target.value)}
                    placeholder="Filter shortcuts..."
                    className="px-3 py-1.5 pl-7 text-xs rounded-xl bg-input border border-neutral-700/60 text-primary-color placeholder-neutral-500 focus:outline-none focus:border-[#ff2d87] w-full sm:w-48"
                  />
                  <span className="absolute left-2.5 top-2 text-[10px] text-muted-color">🔍</span>
                </div>
              </div>

              {/* Table of Shortcuts */}
              <div className="rounded-2xl border border-neutral-800/70 overflow-hidden bg-sidebar/30">
                <div className="max-h-[36vh] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800/60 bg-sidebar/60 text-muted-color text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2 px-3">Shortcut</th>
                        <th className="py-2 px-3">Action Description</th>
                        <th className="py-2 px-3 text-right">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/30">
                      {filteredShortcuts.map((sc, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-neutral-800/20 transition-colors text-primary-color"
                        >
                          <td className="py-2 px-3 font-mono">
                            <div className="flex items-center gap-1">
                              {sc.keys.map((k, kIdx) => (
                                <React.Fragment key={kIdx}>
                                  <kbd className="px-1.5 py-0.5 text-[10px] rounded-md bg-card border border-neutral-700/70 font-semibold shadow-xs">
                                    {k}
                                  </kbd>
                                  {kIdx < sc.keys.length - 1 && (
                                    <span className="text-[10px] text-muted-color">+</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-neutral-300">
                            {sc.action}
                          </td>
                          <td className="py-2 px-3 text-right text-[10px] text-muted-color">
                            <span className="px-2 py-0.5 rounded-full bg-sidebar border border-neutral-800">
                              {sc.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredShortcuts.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-muted-color text-xs">
                            No shortcuts match your search filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-neutral-800/60 bg-sidebar/50">
          {/* Don't show again checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-color hover:text-primary-color">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => handleToggleDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 accent-[#ff2d87] cursor-pointer"
            />
            <span>Don&apos;t show again on startup</span>
          </label>

          {/* Step Dots & Navigation Buttons */}
          <div className="flex items-center gap-4">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    currentStep === idx
                      ? "w-6 bg-[#ff2d87]"
                      : "w-2 bg-neutral-700 hover:bg-neutral-500"
                  }`}
                />
              ))}
            </div>

            {/* Back / Next Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="btn btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Back
              </button>

              <button
                onClick={handleNext}
                className="btn btn-primary shadow-md shadow-[#ff2d87]/25"
              >
                {currentStep === TOTAL_STEPS - 1 ? "Get Started ✓" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
