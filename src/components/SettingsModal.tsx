import React, { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { ThemeMode, SystemUserInfo } from "../types";
import { FoldyLogo } from "./FoldyLogo";
import {
  Button,
  IconAlert,
  IconCheck,
  IconClose,
  IconHelp,
  IconRefresh,
  IconSparkles,
  OutlinedTextField,
} from "./ui";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  detectedUser: SystemUserInfo | null;
  displayName: string;
  onUpdateDisplayName: (name: string) => void;
  workspaceName: string;
  onUpdateWorkspaceName: (ws: string) => void;
  initialTab?: "appearance" | "profile" | "shortcuts" | "updates";
  onOpenTutorials?: () => void;
  onOpenWhatsNew?: () => void;
}

interface ThemeOption {
  id: ThemeMode;
  name: string;
  description: string;
  previewSurface: string;
  previewAccent: string;
  tag: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "material",
    name: "Material 3 Dark",
    description: "Neutral dark tonal surfaces with slate-blue primary accents",
    previewSurface: "#111318",
    previewAccent: "#a4c9ff",
    tag: "Dark",
  },
  {
    id: "pink_light",
    name: "Material 3 Light",
    description: "Clean light tonal surfaces with slate-blue primary accents",
    previewSurface: "#f9f9fc",
    previewAccent: "#2b5b8f",
    tag: "Light",
  },
];

/**
 * Settings and Preferences Modal built on borderless Material 3 tonal surfaces.
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
  onOpenTutorials,
  onOpenWhatsNew,
}) => {
  const [localName, setLocalName] = useState(displayName);
  const [localWorkspace, setLocalWorkspace] = useState(workspaceName);
  const [activeTab, setActiveTab] = useState<
    "appearance" | "profile" | "shortcuts" | "updates"
  >(initialTab);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdateInstalled, setIsUpdateInstalled] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [currentAppVersion, setCurrentAppVersion] = useState("0.1.5");

  useEffect(() => {
    getVersion().then(setCurrentAppVersion).catch(() => {});
  }, []);

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

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus("Connecting to update server...");
    setUpdateError(null);
    try {
      const update = await check();
      if (update) {
        setUpdateInfo(update);
        setUpdateStatus(`Version v${update.version} is available.`);
      } else {
        setUpdateInfo(null);
        setUpdateStatus(`Foldy is up to date (v${currentAppVersion}).`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("Failed to check for updates:", message);
      setUpdateError(
        message ||
          "Could not check for updates. Make sure you are connected to the internet."
      );
      setUpdateStatus(null);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

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
            setUpdateStatus(
              `Downloading: ${(downloaded / (1024 * 1024)).toFixed(1)} MB`
            );
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

  const handleRestartApp = async () => {
    try {
      await relaunch();
    } catch (err: unknown) {
      console.error("Relaunch failed:", err);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = localName.trim() || detectedUser?.display_name || "User";
    const cleanWs = localWorkspace.trim() || "Personal workspace";
    onUpdateDisplayName(cleanName);
    onUpdateWorkspaceName(cleanWs);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetToSystem = () => {
    const sysName =
      detectedUser?.display_name || detectedUser?.username || "User";
    setLocalName(sysName);
    onUpdateDisplayName(sysName);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foldy Preferences"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-container-high rounded-m3-xl shadow-m3-3 flex flex-col overflow-hidden text-on-surface select-none animate-m3-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-container">
          <div className="flex items-center gap-3">
            <FoldyLogo size={32} interactive={true} />
            <div>
              <h2 className="text-base font-semibold text-on-surface">
                Foldy Preferences
              </h2>
              <p className="text-xs text-on-surface-variant">
                Configure theme, account, and workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close preferences"
            onClick={onClose}
            className="w-10 h-10 rounded-m3-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest m3-pressable"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          role="tablist"
          aria-label="Settings sections"
          className="flex items-center gap-1 px-6 pt-2 bg-surface-container text-xs overflow-x-auto"
        >
          {(
            [
              { id: "appearance", label: "Appearance" },
              { id: "profile", label: "User Profile" },
              { id: "shortcuts", label: "Shortcuts" },
              { id: "updates", label: "Updates" },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 min-h-[40px] rounded-t-m3-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-5">
          {activeTab === "appearance" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Color Scheme
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Choose Light or Dark Material 3 tonal surfaces.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected =
                    theme.id === "pink_light"
                      ? currentTheme === "pink_light"
                      : currentTheme !== "pink_light";

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onThemeChange(theme.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-m3-md text-left m3-state-surface m3-pressable ${
                        isSelected
                          ? "bg-primary-container text-on-primary-container"
                          : "bg-surface-container text-on-surface"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-m3-sm shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: theme.previewSurface }}
                        >
                          <div
                            className="w-3.5 h-3.5 rounded-m3-full"
                            style={{ backgroundColor: theme.previewAccent }}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">
                              {theme.name}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-m3-full bg-surface-container-highest text-on-surface-variant font-medium">
                              {theme.tag}
                            </span>
                          </div>
                          <p className="text-xs opacity-80 mt-0.5">
                            {theme.description}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="w-6 h-6 rounded-m3-full bg-primary text-on-primary flex items-center justify-center shrink-0 ml-3">
                          <IconCheck size={14} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  User Workspace Profile
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Foldy reads your signed-in OS account. Customize your display
                  and workspace labels below.
                </p>
              </div>

              {detectedUser && (
                <div className="p-3.5 rounded-m3-md bg-surface-container space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-on-surface-variant">
                      Detected System Account
                    </span>
                    <span className="badge badge-green">Connected</span>
                  </div>
                  <p className="text-xs font-semibold text-on-surface">
                    {detectedUser.display_name}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Username:{" "}
                    <code className="text-primary font-mono">
                      {detectedUser.username}
                    </code>
                  </p>
                </div>
              )}

              <OutlinedTextField
                label="Display Name"
                value={localName}
                onChange={setLocalName}
                placeholder="e.g. Alex"
              />

              <OutlinedTextField
                label="Workspace Title"
                value={localWorkspace}
                onChange={setLocalWorkspace}
                placeholder="e.g. Personal workspace"
              />

              {saveSuccess && (
                <div className="p-3 rounded-m3-sm bg-success-container text-on-success-container text-xs font-medium text-center">
                  Profile updated successfully.
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="text"
                  onClick={handleResetToSystem}
                >
                  Reset to OS Name
                </Button>
                <Button type="submit" variant="filled">
                  Save Profile
                </Button>
              </div>
            </form>
          )}

          {activeTab === "shortcuts" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Keyboard Shortcuts
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Quick keys to navigate and manage files.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { label: "Universal Laptop Search", key: "Ctrl + K" },
                  { label: "Open Folder / Launch File", key: "Double-click" },
                  { label: "Quick Look Preview", key: "Space / P" },
                  { label: "Close Modal / Drawer", key: "Esc" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between p-3 rounded-m3-md bg-surface-container"
                  >
                    <span className="text-on-surface-variant">{row.label}</span>
                    <kbd className="px-2 py-1 rounded-m3-xs bg-surface-container-highest text-on-surface text-[11px] font-mono">
                      {row.key}
                    </kbd>
                  </div>
                ))}
              </div>

              {onOpenTutorials && (
                <Button
                  type="button"
                  variant="tonal"
                  size="md"
                  className="w-full"
                  leadingIcon={<IconHelp size={16} />}
                  onClick={() => {
                    onClose();
                    onOpenTutorials();
                  }}
                >
                  Open Interactive Tutorials & Guide
                </Button>
              )}
            </div>
          )}

          {activeTab === "updates" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Software Updates
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Foldy checks GitHub Releases for signed desktop updates.
                </p>
              </div>

              <div className="p-4 rounded-m3-md bg-surface-container flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FoldyLogo size={36} interactive={false} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-on-surface flex items-center gap-2">
                      Foldy
                      <span className="px-2 py-0.5 rounded-m3-full text-[11px] font-mono bg-secondary-container text-on-secondary-container">
                        v{currentAppVersion}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Current installed desktop version
                    </p>
                  </div>
                </div>

                {!isUpdateInstalled && !updateInfo && (
                  <Button
                    variant="filled"
                    onClick={handleCheckForUpdates}
                    disabled={isCheckingUpdate}
                    leadingIcon={
                      <IconRefresh
                        size={15}
                        className={isCheckingUpdate ? "animate-spin" : ""}
                      />
                    }
                  >
                    {isCheckingUpdate ? "Checking..." : "Check for Updates"}
                  </Button>
                )}
              </div>

              {updateStatus && (
                <div className="p-3 rounded-m3-md bg-surface-container text-xs text-on-surface">
                  {updateStatus}
                </div>
              )}

              {updateError && (
                <div className="p-3 rounded-m3-md bg-error-container text-on-error-container text-xs flex items-start gap-2">
                  <IconAlert size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Update check notice</p>
                    <p className="text-[11px] opacity-90 mt-0.5">{updateError}</p>
                  </div>
                </div>
              )}

              {updateInfo && !isUpdateInstalled && (
                <div className="p-4 rounded-m3-md bg-success-container text-on-success-container space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold">
                        New Update Available: v{updateInfo.version}
                      </h4>
                      {updateInfo.date && (
                        <p className="text-[11px] opacity-80 mt-0.5">
                          Released{" "}
                          {new Date(updateInfo.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="filled"
                      onClick={handleInstallUpdate}
                      disabled={isDownloading}
                    >
                      {isDownloading ? "Downloading..." : "Download & Install"}
                    </Button>
                  </div>

                  {downloadProgress !== null && (
                    <div className="w-full bg-surface-container-highest rounded-m3-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  )}

                  {updateInfo.body && (
                    <div className="p-3 rounded-m3-sm bg-surface-container text-on-surface text-[11px] whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {updateInfo.body}
                    </div>
                  )}
                </div>
              )}

              {isUpdateInstalled && (
                <div className="p-4 rounded-m3-md bg-success-container text-on-success-container flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold">Update Installed</h4>
                    <p className="text-[11px] opacity-85">
                      Restart Foldy to launch the new version.
                    </p>
                  </div>
                  <Button variant="filled" onClick={handleRestartApp}>
                    Restart Foldy
                  </Button>
                </div>
              )}

              {onOpenWhatsNew && (
                <div className="flex items-center justify-between p-3.5 rounded-m3-md bg-surface-container gap-3">
                  <div>
                    <h4 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <IconSparkles size={15} className="text-primary" />
                      <span>Release Highlights</span>
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      View recent features and improvements added to Foldy.
                    </p>
                  </div>
                  <Button variant="tonal" onClick={onOpenWhatsNew}>
                    What&apos;s New
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
