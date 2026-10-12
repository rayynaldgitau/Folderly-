import React, { useState, useEffect } from "react";
import type { ThemeMode, SystemUserInfo } from "../types";

export interface SettingsModalProps {
  /** Whether the settings modal is currently visible. */
  isOpen: boolean;
  /** Callback fired to close the settings modal. */
  onClose: () => void;
  /** Currently active theme identifier. */
  currentTheme: ThemeMode;
  /** Callback fired when the user selects a different theme. */
  onThemeChange: (theme: ThemeMode) => void;
  /** Microsoft/Windows account details detected from the OS. */
  detectedUser: SystemUserInfo | null;
  /** Custom display name currently configured. */
  displayName: string;
  /** Callback fired to update the custom display name. */
  onUpdateDisplayName: (name: string) => void;
  /** Custom workspace name currently configured. */
  workspaceName: string;
  /** Callback fired to update the workspace name. */
  onUpdateWorkspaceName: (ws: string) => void;
}

/** Theme metadata for the settings picker card list. */
interface ThemeOption {
  id: ThemeMode;
  name: string;
  description: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  tag: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "pink",
    name: "OLED Pink (Dark)",
    description: "Deep true-black OLED canvas with vibrant hot pink accents.",
    accentColor: "#ff2d87",
    bgColor: "#120e12",
    textColor: "#ffffff",
    tag: "Dark",
  },
  {
    id: "pink_light",
    name: "Light Pink",
    description: "Soft pastel pink background with high-contrast hot pink accents.",
    accentColor: "#ff2d87",
    bgColor: "#fceef2",
    textColor: "#2d1a24",
    tag: "Light",
  },
  {
    id: "material",
    name: "Material Design",
    description: "Google Material 3 inspired theme with indigo and cyan tones.",
    accentColor: "#6750a4",
    bgColor: "#141218",
    textColor: "#e6e1e5",
    tag: "Material",
  },
  {
    id: "apple",
    name: "Apple Design (macOS)",
    description: "Cupertino minimalist styling with subtle cool grey and blue tints.",
    accentColor: "#0a84ff",
    bgColor: "#1c1c1e",
    textColor: "#ffffff",
    tag: "macOS",
  },
  {
    id: "dark",
    name: "Midnight Dark",
    description: "Professional neutral dark theme with violet accents.",
    accentColor: "#8b5cf6",
    bgColor: "#09090b",
    textColor: "#fafafa",
    tag: "Dark",
  },
];

/**
 * Settings and Preferences Modal.
 *
 * Allows configuring the active theme, viewing the detected Microsoft/Windows user,
 * and customizing the display name and workspace label with persistence.
 */
const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
  detectedUser,
  displayName,
  onUpdateDisplayName,
  workspaceName,
  onUpdateWorkspaceName,
}) => {
  const [localName, setLocalName] = useState(displayName);
  const [localWorkspace, setLocalWorkspace] = useState(workspaceName);
  const [activeTab, setActiveTab] = useState<"appearance" | "profile" | "shortcuts">("appearance");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync internal state when parent props change or modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalName(displayName);
      setLocalWorkspace(workspaceName);
      setSaveSuccess(false);
    }
  }, [isOpen, displayName, workspaceName]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /** Saves updated profile information to local state and persistence. */
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = localName.trim() || detectedUser?.display_name || "User";
    const cleanWs = localWorkspace.trim() || "Personal workspace";
    onUpdateDisplayName(cleanName);
    onUpdateWorkspaceName(cleanWs);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  /** Resets custom username to the detected Microsoft / OS username. */
  const handleResetToSystem = () => {
    const sysName = detectedUser?.display_name || detectedUser?.username || "User";
    setLocalName(sysName);
    onUpdateDisplayName(sysName);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-card border border-neutral-800/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-primary-color select-none transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/40 bg-sidebar/50">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚙️</span>
            <div>
              <h2 className="text-sm font-bold text-primary-color">Preferences & Settings</h2>
              <p className="text-[11px] text-muted-color">Configure theme, account, and workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-color hover:text-primary-color hover:bg-neutral-800/50 text-xs transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-neutral-800/30 text-xs">
          <button
            onClick={() => setActiveTab("appearance")}
            className={`px-3 py-2 rounded-t-xl font-semibold border-b-2 transition-all ${
              activeTab === "appearance"
                ? "border-[#ff2d87] text-primary-color"
                : "border-transparent text-muted-color hover:text-primary-color"
            }`}
          >
            🎨 Appearance
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-3 py-2 rounded-t-xl font-semibold border-b-2 transition-all ${
              activeTab === "profile"
                ? "border-[#ff2d87] text-primary-color"
                : "border-transparent text-muted-color hover:text-primary-color"
            }`}
          >
            👤 User Profile
          </button>
          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`px-3 py-2 rounded-t-xl font-semibold border-b-2 transition-all ${
              activeTab === "shortcuts"
                ? "border-[#ff2d87] text-primary-color"
                : "border-transparent text-muted-color hover:text-primary-color"
            }`}
          >
            ⌨️ Shortcuts
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-4">
          {/* TAB 1: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-color mb-1">
                  Select Theme
                </h3>
                <p className="text-xs text-muted-color mb-3">
                  Choose your preferred color palette. Changes are saved instantly.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = currentTheme === theme.id;

                  return (
                    <div
                      key={theme.id}
                      onClick={() => onThemeChange(theme.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-[#ff2d87] bg-[#ff2d87]/10 ring-1 ring-[#ff2d87]"
                          : "border-neutral-800/40 hover:border-neutral-700 bg-sidebar/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Swatch Preview Box */}
                        <div
                          className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm border border-neutral-700/30"
                          style={{ backgroundColor: theme.bgColor }}
                        >
                          <div
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: theme.accentColor }}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary-color">
                              {theme.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800/50 text-muted-color font-medium">
                              {theme.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-color mt-0.5">
                            {theme.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 ml-3">
                        {isSelected ? (
                          <span className="w-6 h-6 rounded-full bg-[#ff2d87] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                            ✓
                          </span>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-neutral-700/60" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-color mb-1">
                  User Workspace Profile
                </h3>
                <p className="text-xs text-muted-color mb-3">
                  Folderly automatically reads your signed-in Windows / Microsoft account. You can also customize your display name.
                </p>
              </div>

              {/* Detected System Info Card */}
              {detectedUser && (
                <div className="p-3.5 rounded-2xl bg-sidebar/50 border border-neutral-800/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-color">
                      Detected System Account:
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs font-bold text-primary-color">
                    {detectedUser.display_name}
                  </p>
                  <p className="text-[10px] text-muted-color">
                    Windows username: <code className="text-[#ff2d87]">{detectedUser.username}</code>
                  </p>
                </div>
              )}

              {/* Custom Display Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-primary-color">Display Name</label>
                <input
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="e.g. Raynald Gitau"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sidebar border border-neutral-800/40 text-xs text-primary-color placeholder-muted-color outline-none focus:border-[#ff2d87] transition-colors"
                />
              </div>

              {/* Custom Workspace Label Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-primary-color">Workspace Title</label>
                <input
                  type="text"
                  value={localWorkspace}
                  onChange={(e) => setLocalWorkspace(e.target.value)}
                  placeholder="e.g. Personal workspace"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sidebar border border-neutral-800/40 text-xs text-primary-color placeholder-muted-color outline-none focus:border-[#ff2d87] transition-colors"
                />
              </div>

              {saveSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium text-center animate-fade-in">
                  Profile updated successfully!
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResetToSystem}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-muted-color hover:text-primary-color hover:bg-neutral-800/40 transition-colors"
                >
                  Reset to OS Name
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#ff2d87] hover:bg-[#e61b74] text-white text-xs font-bold shadow-md shadow-[#ff2d87]/20 transition-all active:scale-[0.98]"
                >
                  Save Profile
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SHORTCUTS */}
          {activeTab === "shortcuts" && (
            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-color mb-1">
                  Keyboard Shortcuts
                </h3>
                <p className="text-xs text-muted-color mb-3">
                  Quick keys to navigate and manage files efficiently.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-sidebar/40 border border-neutral-800/30">
                  <span className="text-muted-color">Universal Laptop Search</span>
                  <kbd className="px-2 py-1 rounded bg-neutral-800 text-primary-color text-[11px] font-mono border border-neutral-700/50">
                    Ctrl + K
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-sidebar/40 border border-neutral-800/30">
                  <span className="text-muted-color">Open Folder / Launch File</span>
                  <span className="text-primary-color font-medium">Double-click</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-sidebar/40 border border-neutral-800/30">
                  <span className="text-muted-color">Context Menu</span>
                  <span className="text-primary-color font-medium">Right-click</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-sidebar/40 border border-neutral-800/30">
                  <span className="text-muted-color">Close Modal / Drawer</span>
                  <kbd className="px-2 py-1 rounded bg-neutral-800 text-primary-color text-[11px] font-mono border border-neutral-700/50">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
