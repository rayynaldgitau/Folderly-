import React, { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { ThemeMode, SystemUserInfo } from "../types";
import { FoldyLogo } from "./FoldyLogo";

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
  /** Optional tab to open when the modal becomes visible. */
  initialTab?: "appearance" | "profile" | "shortcuts" | "updates";
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
    name: "Material You (Google & Android)",
    description: "Authentic Google & Android Material 3 with signature Google Blue and Android Green.",
    accentColor: "#1a73e8",
    bgColor: "#131314",
    textColor: "#f1f3f4",
    tag: "Android",
  },
  {
    id: "apple",
    name: "Apple Design (macOS)",
    description: "Neutral gray-and-silver system backdrop with Apple Multicolor accents.",
    accentColor: "#e5e7eb",
    bgColor: "#24262b",
    textColor: "#f5f5f7",
    tag: "macOS",
  },
  {
    id: "dark",
    name: "Midnight Orange",
    description: "Obsidian midnight black with subtle matte orange accents.",
    accentColor: "#ea580c",
    bgColor: "#0c0c0e",
    textColor: "#f4f4f5",
    tag: "Matte",
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
  initialTab = "appearance",
}) => {
  const [localName, setLocalName] = useState(displayName);
  const [localWorkspace, setLocalWorkspace] = useState(workspaceName);
  const [activeTab, setActiveTab] = useState<"appearance" | "profile" | "shortcuts" | "updates">(initialTab);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auto-updater state
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdateInstalled, setIsUpdateInstalled] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [currentAppVersion, setCurrentAppVersion] = useState("0.1.0");

  // Query actual installed app version dynamically from Tauri
  useEffect(() => {
    getVersion().then(setCurrentAppVersion).catch(() => {});
  }, []);

  // Sync internal state when parent props change or modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalName(displayName);
      setLocalWorkspace(workspaceName);
      setSaveSuccess(false);
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, displayName, workspaceName, initialTab]);

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

  /**
   * Checks GitHub Releases via Tauri's Updater for a new version.
   *
   * @returns Promise resolving when update check completes.
   */
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus("Connecting to update server...");
    setUpdateError(null);
    try {
      const update = await check();
      if (update) {
        setUpdateInfo(update);
        setUpdateStatus(`Version v${update.version} is available!`);
      } else {
        setUpdateInfo(null);
        setUpdateStatus(`Foldy is up to date (v${currentAppVersion}).`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("Failed to check for updates:", message);
      setUpdateError(
        message || "Could not check for updates. Make sure you are connected to the internet."
      );
      setUpdateStatus(null);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  /**
   * Downloads and installs the pending update.
   *
   * @returns Promise resolving when installation completes.
   */
  const handleInstallUpdate = async () => {
    if (!updateInfo) return;
    setIsDownloading(true);
    setUpdateError(null);
    setUpdateStatus("Downloading update package...");

    try {
      let downloaded = 0;
      let totalLength = 0;

      await updateInfo.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalLength = event.data.contentLength || 0;
          setUpdateStatus("Download started...");
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (totalLength > 0) {
            const pct = Math.round((downloaded / totalLength) * 100);
            setDownloadProgress(pct);
            setUpdateStatus(`Downloading update (${pct}%)...`);
          } else {
            setUpdateStatus(`Downloading: ${(downloaded / (1024 * 1024)).toFixed(1)} MB`);
          }
        } else if (event.event === "Finished") {
          setUpdateStatus("Update installed! Restart to apply.");
          setIsUpdateInstalled(true);
        }
      });

      setIsUpdateInstalled(true);
      setUpdateStatus("Update installed successfully. Restart Foldy to apply.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Install update failed:", message);
      setUpdateError(message || "Failed to download and install update.");
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Restarts Foldy to launch the newly installed version.
   *
   * @returns Promise resolving when relaunch command is sent.
   */
  const handleRestartApp = async () => {
    try {
      await relaunch();
    } catch (err: unknown) {
      console.error("Relaunch failed:", err);
    }
  };

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
          <div className="flex items-center gap-3">
            <FoldyLogo size={32} interactive={true} />
            <div>
              <h2 className="text-sm font-bold text-primary-color flex items-center gap-1.5">
                Foldy Preferences
              </h2>
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
                ? "border-red-500 text-primary-color"
                : "border-transparent text-muted-color hover:text-primary-color"
            }`}
          >
            🎨 Appearance
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-3 py-2 rounded-t-xl font-semibold border-b-2 transition-all ${
              activeTab === "profile"
                ? "border-red-500 text-primary-color"
                : "border-transparent text-muted-color hover:text-primary-color"
            }`}
          >
            👤 User Profile
          </button>
          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`px-3 py-2 rounded-t-xl font-semibold border-b-2 transition-all ${
              activeTab === "shortcuts"
                ? "border-red-500 text-primary-color"
                : "border-transparent text-muted-color hover:text-primary-color"
            }`}
          >
            ⌨️ Shortcuts
          </button>
          <button
            onClick={() => setActiveTab("updates")}
            className={`px-3 py-2 rounded-t-xl font-semibold border-b-2 transition-all ${
              activeTab === "updates"
                ? "border-red-500 text-primary-color"
                : "border-transparent text-muted-color hover:text-primary-color"
            }`}
          >
            🔄 Updates
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
                  Foldy automatically reads your signed-in Windows / Microsoft account. You can also customize your display name.
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
                  placeholder="e.g. Alex"
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

          {/* TAB 4: UPDATES */}
          {activeTab === "updates" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-color mb-1">
                  Software Updates
                </h3>
                <p className="text-xs text-muted-color">
                  Foldy checks GitHub Releases for verified new versions and delivers live automatic updates.
                </p>
              </div>

              {/* Version Info Card */}
              <div className="p-4 rounded-2xl bg-sidebar/50 border border-neutral-800/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FoldyLogo size={36} interactive={false} />
                  <div>
                    <div className="text-sm font-bold text-primary-color flex items-center gap-2">
                      Foldy
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500/10 text-red-500 border border-red-500/20">
                        v{currentAppVersion}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-color">
                      Current installed desktop version
                    </p>
                  </div>
                </div>

                {!isUpdateInstalled && !updateInfo && (
                  <button
                    onClick={handleCheckForUpdates}
                    disabled={isCheckingUpdate}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20 active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isCheckingUpdate ? (
                      <>
                        <span className="animate-spin text-xs">⏳</span>
                        Checking...
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        Check for Updates
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Status Message or Error */}
              {updateStatus && (
                <div className="p-3 rounded-xl bg-neutral-800/40 border border-neutral-700/40 text-xs text-primary-color flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>{updateStatus}</span>
                </div>
              )}

              {updateError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300 flex items-start gap-2">
                  <span className="shrink-0">⚠️</span>
                  <div>
                    <p className="font-semibold">Update check notice</p>
                    <p className="text-[11px] text-red-400 mt-0.5">{updateError}</p>
                  </div>
                </div>
              )}

              {/* Update Available Action Card */}
              {updateInfo && !isUpdateInstalled && (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <span>🚀</span> New Update Available: v{updateInfo.version}
                      </h4>
                      {updateInfo.date && (
                        <p className="text-[10px] text-muted-color mt-0.5">
                          Released {new Date(updateInfo.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleInstallUpdate}
                      disabled={isDownloading}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isDownloading ? "Downloading..." : "Download & Install Now"}
                    </button>
                  </div>

                  {downloadProgress !== null && (
                    <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  )}

                  {updateInfo.body && (
                    <div className="p-3 rounded-xl bg-black/40 border border-neutral-800 text-[11px] text-muted-color whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {updateInfo.body}
                    </div>
                  )}
                </div>
              )}

              {/* Ready to Restart Card */}
              {isUpdateInstalled && (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-600/50 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400">
                      🎉 Update Installed Successfully!
                    </h4>
                    <p className="text-[11px] text-muted-color">
                      Restart Foldy now to launch the new version.
                    </p>
                  </div>
                  <button
                    onClick={handleRestartApp}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98]"
                  >
                    Restart Foldy
                  </button>
                </div>
              )}

              <div className="p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/40 text-[11px] text-muted-color leading-relaxed">
                💡 <strong>How live updates work:</strong> When you push an update to GitHub, GitHub Actions packages and signs the release. Foldy automatically downloads the signed update without needing to manually run installers again.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
