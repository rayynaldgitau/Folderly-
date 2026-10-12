import React, { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import NavigationBar from "./components/NavigationBar";
import Sidebar from "./components/Sidebar";
import FileGrid from "./components/FileGrid";
import FileTableView from "./components/FileTableView";
import FileContextMenu from "./components/FileContextMenu";
import RuleBuilder from "./components/RuleBuilder";
import PreviewPanel from "./components/PreviewPanel";
import StatusBar from "./components/StatusBar";
import UniversalSearchModal from "./components/UniversalSearchModal";
import SettingsModal from "./components/SettingsModal";
import { THEMES } from "./themes";

import type {
  FileEntry,
  FolderEntry,
  DirContents,
  QuickAccessItem,
  RenamePreview,
  RenameRules,
  ViewMode,
  ThemeMode,
  DrawerPosition,
  SortField,
  SystemUserInfo,
} from "./types";

/** Default initial rule configuration. */
const DEFAULT_RULES: RenameRules = {
  replace_spaces_with: "",
  add_date_prefix: false,
  find_pattern: "",
  replace_pattern: "",
  to_lowercase: false,
  to_uppercase: false,
  trim_whitespace: false,
  strip_prefix: "",
  strip_suffix: "",
  append_text: "",
  prepend_text: "",
};

/**
 * Root Application Component for Folderly.
 *
 * Implements a full visual File Explorer with multiple themes (Pink, Material, Apple, Dark),
 * customizable sidebars, flexible drawer positioning, and folder ordering controls.
 */
const App: React.FC = () => {
  // ── Appearance & Layout State ────────────────────────────────────────────
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem("folderly_theme") as ThemeMode) || "pink";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isRenamerOpen, setIsRenamerOpen] = useState<boolean>(false);
  const [renamerPosition, setRenamerPosition] = useState<DrawerPosition>("right");
  const [foldersFirst, setFoldersFirst] = useState<boolean>(true);
  const [sortField, setSortField] = useState<SortField>("name");
  const [isUniversalSearchOpen, setIsUniversalSearchOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // ── User Profile & Microsoft Account State ────────────────────────────────
  const [detectedUser, setDetectedUser] = useState<SystemUserInfo | null>(null);
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem("folderly_username") || "Raynald Gitau";
  });
  const [workspaceName, setWorkspaceName] = useState<string>(() => {
    return localStorage.getItem("folderly_workspace") || "Personal workspace";
  });

  // Global Ctrl+K / Cmd+K listener for Universal Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsUniversalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Navigation & Explorer State ──────────────────────────────────────────
  const [currentPath, setCurrentPath]     = useState<string | null>(null);
  const [history, setHistory]             = useState<string[]>([]);
  const [historyIndex, setHistoryIndex]   = useState<number>(-1);
  const [folders, setFolders]             = useState<FolderEntry[]>([]);
  const [files, setFiles]                 = useState<FileEntry[]>([]);
  const [quickAccess, setQuickAccess]     = useState<QuickAccessItem[]>([]);
  const [searchQuery, setSearchQuery]     = useState<string>("");
  const [viewMode, setViewMode]           = useState<ViewMode>("cards");
  const [isRecursive, setIsRecursive]     = useState<boolean>(false);

  // ── Selection & Bulk Renaming State ──────────────────────────────────────
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [rules, setRules]                 = useState<RenameRules>(DEFAULT_RULES);
  const [previews, setPreviews]           = useState<RenamePreview[]>([]);
  const [undoCount, setUndoCount]         = useState<number>(0);

  // ── UI Context Menu & Status ─────────────────────────────────────────────
  const [contextMenu, setContextMenu]     = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    targetPath: string | null;
    isFolder: boolean;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    targetPath: null,
    isFolder: false,
  });

  const [status, setStatus]               = useState<{
    msg: string;
    type: "info" | "success" | "error";
  }>({
    msg: "Welcome to Folderly. Select a drive or folder to start exploring.",
    type: "info",
  });
  const [loading, setLoading]             = useState<boolean>(false);

  // ── Theme & Profile Handlers ──────────────────────────────────────────────

  const handleThemeChange = useCallback((theme: ThemeMode) => {
    setCurrentTheme(theme);
    localStorage.setItem("folderly_theme", theme);
  }, []);

  const handleUpdateDisplayName = useCallback((name: string) => {
    setDisplayName(name);
    localStorage.setItem("folderly_username", name);
  }, []);

  const handleUpdateWorkspaceName = useCallback((ws: string) => {
    setWorkspaceName(ws);
    localStorage.setItem("folderly_workspace", ws);
  }, []);

  // ── Undo Batch Helper ────────────────────────────────────────────────────

  const refreshUndoCount = useCallback(async () => {
    try {
      const count = await invoke<number>("undo_batch_count");
      setUndoCount(count);
    } catch {
      // non-critical
    }
  }, []);

  // ── Directory Navigation ─────────────────────────────────────────────────

  const navigateTo = useCallback(
    async (path: string, pushHistory = true) => {
      if (!path) return;
      setLoading(true);
      setSelectedPaths(new Set());
      setPreviews([]);

      // Special handling for the Recents view (recently downloaded & opened items)
      if (path === "recents") {
        setStatus({ msg: "Loading recent downloads and opened files…", type: "info" });
        setFolders([]);

        try {
          // 1. Get recent opened files from localStorage
          const rawOpened = localStorage.getItem("folderly_recent_opened");
          const openedList: Array<{
            path: string;
            name: string;
            extension: string;
            size: number;
            opened_at: string;
          }> = rawOpened ? JSON.parse(rawOpened) : [];

          // 2. Query recent files from the Downloads folder
          let downloadsFiles: FileEntry[] = [];
          try {
            const qa = await invoke<QuickAccessItem[]>("get_quick_access");
            const dlItem = qa.find((q) => q.name.toLowerCase() === "downloads");
            if (dlItem?.path) {
              const dlContents = await invoke<DirContents>("read_folder_contents", {
                dirPath: dlItem.path,
              });
              downloadsFiles = dlContents.files;
            }
          } catch (e) {
            console.error("Failed to read downloads folder for recents:", e);
          }

          // Convert opened files to FileEntry format
          const openedAsFiles: FileEntry[] = openedList.map((item) => ({
            path: item.path,
            name: item.name,
            extension: item.extension,
            size: item.size,
            created_at: item.opened_at,
            modified_at: item.opened_at,
          }));

          // Merge and deduplicate by lowercased path
          const fileMap = new Map<string, FileEntry>();
          for (const f of downloadsFiles) {
            fileMap.set(f.path.toLowerCase(), f);
          }
          for (const f of openedAsFiles) {
            fileMap.set(f.path.toLowerCase(), f);
          }

          const combined = Array.from(fileMap.values()).sort((a, b) =>
            (b.modified_at || "").localeCompare(a.modified_at || "")
          );

          setFiles(combined);
          setCurrentPath("recents");
          setStatus({
            msg: `Recents: showing ${combined.length} recent download(s) and opened file(s).`,
            type: "info",
          });

          if (pushHistory) {
            setHistory((prev) => {
              const next = prev.slice(0, historyIndex + 1);
              next.push("recents");
              return next;
            });
            setHistoryIndex((prev) => prev + 1);
          }
        } catch (err) {
          setStatus({ msg: `Error loading recents: ${err}`, type: "error" });
        } finally {
          setLoading(false);
        }
        return;
      }

      setStatus({ msg: `Loading "${path}"…`, type: "info" });
      try {
        if (isRecursive) {
          const allFiles = await invoke<FileEntry[]>("scan_directory", { dirPath: path });
          setFiles(allFiles);
          setFolders([]);
          setStatus({
            msg: `Loaded ${allFiles.length} file(s) recursively from "${path}".`,
            type: "success",
          });
        } else {
          const contents = await invoke<DirContents>("read_folder_contents", { dirPath: path });
          setFolders(contents.folders);
          setFiles(contents.files);
          setStatus({
            msg: `Browsing "${contents.current_path}" (${contents.folders.length} folders, ${contents.files.length} files).`,
            type: "info",
          });
        }

        setCurrentPath(path);

        if (pushHistory) {
          setHistory((prev) => {
            const next = prev.slice(0, historyIndex + 1);
            next.push(path);
            return next;
          });
          setHistoryIndex((prev) => prev + 1);
        }
      } catch (err) {
        setStatus({ msg: `Navigation error: ${err}`, type: "error" });
      } finally {
        setLoading(false);
      }
    },
    [isRecursive, historyIndex]
  );

  const handleGoBack = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const target = history[prevIndex];
      setHistoryIndex(prevIndex);
      navigateTo(target, false);
    }
  }, [historyIndex, history, navigateTo]);

  const handleGoForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const target = history[nextIndex];
      setHistoryIndex(nextIndex);
      navigateTo(target, false);
    }
  }, [historyIndex, history, navigateTo]);

  const handleGoUp = useCallback(() => {
    if (!currentPath || currentPath === "recents") return;
    const parts = currentPath.replace(/\\/g, "/").split("/").filter(Boolean);
    if (parts.length <= 1) return;
    parts.pop();
    let parent = parts.join("/");
    if (currentPath.includes(":\\") && parts.length === 1) {
      parent = `${parts[0]}\\`;
    } else if (currentPath.includes("\\")) {
      parent = parts.join("\\");
    }
    navigateTo(parent);
  }, [currentPath, navigateTo]);

  const handleRefresh = useCallback(() => {
    if (currentPath) {
      navigateTo(currentPath, false);
    }
  }, [currentPath, navigateTo]);

  const handleOpenFolderPicker = useCallback(async () => {
    try {
      const dir = await open({ directory: true, multiple: false });
      if (dir && typeof dir === "string") {
        navigateTo(dir);
      }
    } catch (err) {
      setStatus({ msg: `Dialog error: ${err}`, type: "error" });
    }
  }, [navigateTo]);

  /** Prompts for a folder name and creates a new directory in the current path. */
  const handleNewFolder = useCallback(async () => {
    if (!currentPath || currentPath === "recents") {
      setStatus({
        msg: "Please navigate to a regular directory before creating a folder.",
        type: "error",
      });
      return;
    }
    const name = window.prompt("Enter new folder name:", "New folder");
    if (!name || !name.trim()) return;
    try {
      const separator = currentPath.includes("/") && !currentPath.includes("\\") ? "/" : "\\";
      const newDirPath = currentPath.endsWith(separator)
        ? `${currentPath}${name.trim()}`
        : `${currentPath}${separator}${name.trim()}`;
      await invoke("create_directory", { dirPath: newDirPath });
      setStatus({ msg: `Created folder "${name.trim()}".`, type: "success" });
      navigateTo(currentPath, false);
    } catch (err) {
      setStatus({ msg: `Error creating folder: ${err}`, type: "error" });
    }
  }, [currentPath, navigateTo]);

  // ── Initial Mount: System User, Quick Access & Defaults ──────────────────

  useEffect(() => {
    async function init() {
      refreshUndoCount();

      // Query signed-in Microsoft / Windows user account
      try {
        const sysUser = await invoke<SystemUserInfo>("get_system_user");
        setDetectedUser(sysUser);
        if (!localStorage.getItem("folderly_username") && sysUser.display_name) {
          setDisplayName(sysUser.display_name);
        }
      } catch (e) {
        console.error("System user detection error:", e);
      }

      try {
        const qa = await invoke<QuickAccessItem[]>("get_quick_access");
        setQuickAccess(qa);
        const defaultTarget =
          qa.find((q) => q.name === "Downloads")?.path ||
          qa.find((q) => q.name === "Desktop")?.path ||
          qa[0]?.path;
        if (defaultTarget) {
          navigateTo(defaultTarget);
        }
      } catch (e) {
        console.error("Init error:", e);
      }
    }
    init();
  }, []);

  // ── File Launch & OS Interactions ────────────────────────────────────────

  /**
   * Persists an opened file path and metadata into localStorage for the Recents page.
   *
   * @param filePath - The absolute file path to record.
   */
  const recordRecentFile = useCallback(
    (filePath: string) => {
      try {
        const existing = files.find((f) => f.path.toLowerCase() === filePath.toLowerCase());
        const name = existing ? existing.name : filePath.split(/[\\/]/).pop() || "File";
        const ext = existing
          ? existing.extension
          : name.includes(".")
          ? name.split(".").pop() || ""
          : "";
        const size = existing ? existing.size : 0;
        const opened_at = new Date().toISOString();

        const raw = localStorage.getItem("folderly_recent_opened");
        let list: Array<{
          path: string;
          name: string;
          extension: string;
          size: number;
          opened_at: string;
        }> = raw ? JSON.parse(raw) : [];

        list = list.filter((item) => item.path.toLowerCase() !== filePath.toLowerCase());
        list.unshift({ path: filePath, name, extension: ext, size, opened_at });
        if (list.length > 80) list = list.slice(0, 80);

        localStorage.setItem("folderly_recent_opened", JSON.stringify(list));
      } catch {
        // non-critical
      }
    },
    [files]
  );

  /**
   * Opens a file using the operating system's default handler and registers it in recents.
   *
   * @param path - The absolute file path to open.
   */
  const handleOpenFile = useCallback(
    async (path: string) => {
      try {
        await invoke("open_in_os", { path });
        recordRecentFile(path);
        setStatus({ msg: `Opened: ${path}`, type: "info" });
      } catch (err) {
        setStatus({ msg: `Error opening item: ${err}`, type: "error" });
      }
    },
    [recordRecentFile]
  );

  /**
   * Spawns a new independent Folderly window like File Explorer (Ctrl+N).
   */
  const handleOpenNewWindow = useCallback(async () => {
    try {
      await invoke("open_new_window");
      setStatus({ msg: "Opened new Folderly window.", type: "success" });
    } catch (err) {
      setStatus({ msg: `Failed to open new window: ${err}`, type: "error" });
    }
  }, []);

  // Global keyboard shortcuts (Ctrl+N for new window)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleOpenNewWindow();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenNewWindow]);

  const handleShowInFileManager = useCallback(async (path: string) => {
    try {
      await invoke("show_in_file_manager", { path });
      setStatus({ msg: `Revealed in File Explorer: ${path}`, type: "info" });
    } catch (err) {
      setStatus({ msg: `Error revealing item: ${err}`, type: "error" });
    }
  }, []);

  const handleDeleteItem = useCallback(
    async (path: string) => {
      const name = path.split(/[\\/]/).pop();
      if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

      try {
        await invoke("delete_item", { path });
        setStatus({ msg: `Deleted "${name}".`, type: "success" });
        if (currentPath) {
          navigateTo(currentPath, false);
        }
      } catch (err) {
        setStatus({ msg: `Delete error: ${err}`, type: "error" });
      }
    },
    [currentPath, navigateTo]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, path: string, isFolder: boolean) => {
      e.preventDefault();
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        targetPath: path,
        isFolder,
      });
    },
    []
  );

  // ── Renaming Engine Actions ──────────────────────────────────────────────

  const handlePreview = useCallback(async () => {
    const targets =
      selectedPaths.size > 0
        ? files.filter((f) => selectedPaths.has(f.path)).map((f) => f.path)
        : files.map((f) => f.path);

    if (targets.length === 0) {
      setStatus({ msg: "No files to rename in current folder.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const result = await invoke<RenamePreview[]>("preview_renames", {
        filePaths: targets,
        rules,
      });
      setPreviews(result);
      const changes = result.filter(
        (r) => r.original_path !== r.new_path && !r.new_path.startsWith("ERROR:")
      ).length;
      setStatus({
        msg: `Preview ready: ${changes} file(s) will be renamed.`,
        type: "info",
      });
      setIsRenamerOpen(true);
    } catch (err) {
      setStatus({ msg: `Preview error: ${err}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [files, selectedPaths, rules]);

  const handleCommit = useCallback(async () => {
    if (previews.length === 0) {
      setStatus({ msg: "Run 'Preview Changes' first.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const summary = await invoke<string>("commit_renames", { previews });
      setStatus({ msg: summary, type: "success" });
      await refreshUndoCount();
      if (currentPath) {
        navigateTo(currentPath, false);
      }
    } catch (err) {
      setStatus({ msg: `Commit error: ${err}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [previews, currentPath, refreshUndoCount, navigateTo]);

  const handleUndo = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await invoke<string>("undo_last_batch");
      setStatus({ msg: `Undo successful: ${summary}`, type: "success" });
      await refreshUndoCount();
      if (currentPath) {
        navigateTo(currentPath, false);
      }
    } catch (err) {
      setStatus({ msg: `Undo error: ${err}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [currentPath, refreshUndoCount, navigateTo]);

  // ── Filtered & Sorted Items ──────────────────────────────────────────────

  /** Filter and sort folders according to search query and active sort field. */
  const filteredFolders = useMemo(() => {
    let result = folders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      if (sortField === "date") {
        return (b.modified_at || "").localeCompare(a.modified_at || "");
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [folders, searchQuery, sortField]);

  /** Filter and sort files according to search query and active sort field. */
  const filteredFiles = useMemo(() => {
    let result = files;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) => f.name.toLowerCase().includes(q) || f.extension.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      if (sortField === "date") {
        return (b.modified_at || "").localeCompare(a.modified_at || "");
      }
      if (sortField === "size") {
        return b.size - a.size;
      }
      if (sortField === "type") {
        const extA = (a.extension || "").toLowerCase();
        const extB = (b.extension || "").toLowerCase();
        const extComp = extA.localeCompare(extB);
        if (extComp !== 0) return extComp;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [files, searchQuery, sortField]);

  // ── Selection Toggles ────────────────────────────────────────────────────

  /** Toggles individual file selection. */
  const toggleSelect = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
    setPreviews([]);
  }, []);

  /** Toggles selecting all currently displayed/filtered files. */
  const toggleSelectAll = useCallback(() => {
    setSelectedPaths((prev) =>
      prev.size === filteredFiles.length
        ? new Set()
        : new Set(filteredFiles.map((f) => f.path))
    );
    setPreviews([]);
  }, [filteredFiles]);

  // ── Renamer Drawer Render Helper ─────────────────────────────────────────

  const renderRenamerDrawer = () => (
    <aside className="w-full sm:w-[380px] max-w-full shrink-0 border-x border-neutral-800 flex flex-col bg-neutral-900/95 overflow-hidden shadow-2xl z-20">
      <div className="p-3 border-b border-neutral-800 bg-neutral-900 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡</span>
            <span>Bulk Renamer</span>
          </h2>
          <p className="text-[10px] text-neutral-500">
            {selectedPaths.size > 0
              ? `${selectedPaths.size} file(s) selected`
              : `All ${files.length} file(s)`}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePreview}
            disabled={loading || files.length === 0}
            className="btn btn-secondary text-xs px-2.5 py-1"
            title="Generate preview without modifying disk"
          >
            🔍 Preview
          </button>

          <button
            onClick={handleCommit}
            disabled={loading || previews.length === 0}
            className="btn btn-primary text-xs px-2.5 py-1"
            title="Execute rename operations safely"
          >
            ✅ Commit
          </button>

          <button
            onClick={handleUndo}
            disabled={loading || undoCount === 0}
            className="btn btn-danger text-xs px-2 py-1"
            title={`${undoCount} undo batch(es) available`}
          >
            ↩ {undoCount > 0 ? `(${undoCount})` : ""}
          </button>

          <button
            onClick={() => setIsRenamerOpen(false)}
            className="text-neutral-500 hover:text-white p-1 rounded-md text-xs hover:bg-neutral-800 transition-colors ml-1"
            title="Close renamer drawer"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-neutral-800">
        <RuleBuilder rules={rules} onChange={setRules} />
        {previews.length > 0 && <PreviewPanel previews={previews} />}
      </div>
    </aside>
  );

  const themeConfig = THEMES[currentTheme] || THEMES.pink;

  return (
    <div
      className={`relative flex h-screen overflow-hidden font-sans select-none ${themeConfig.rootClass}`}
      data-theme={currentTheme}
    >
      {/* ── Left Renamer Drawer (when position is 'left') ── */}
      {isRenamerOpen && renamerPosition === "left" && renderRenamerDrawer()}

      {/* ── Left Sidebar (Collapsible with off-canvas backdrop for split-screen snapping) ── */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed md:static inset-y-0 left-0 z-40 flex shadow-2xl md:shadow-none">
            <Sidebar
              selectedDir={currentPath}
              fileCount={filteredFiles.length}
              folderCount={filteredFolders.length}
              quickAccess={quickAccess}
              currentFolders={folders}
              onOpenFolder={handleOpenFolderPicker}
              onNavigate={(path) => {
                navigateTo(path);
                // On mobile/narrow split, close sidebar after clicking
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                }
              }}
              onClose={() => setIsSidebarOpen(false)}
              displayName={displayName}
              workspaceName={workspaceName}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>
        </>
      )}

      {/* ── Main Workspace ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Navigation Bar with Theme & Layout Controls */}
        <NavigationBar
          currentPath={currentPath}
          canGoBack={historyIndex > 0}
          canGoForward={historyIndex < history.length - 1}
          canGoUp={Boolean(
            currentPath &&
              currentPath !== "recents" &&
              (currentPath.includes("/") || currentPath.includes("\\"))
          )}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onGoUp={handleGoUp}
          onRefresh={handleRefresh}
          onNavigate={(path) => navigateTo(path)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isRecursive={isRecursive}
          onToggleRecursive={() => {
            setIsRecursive((prev) => !prev);
            if (currentPath) navigateTo(currentPath, false);
          }}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isRenamerOpen={isRenamerOpen}
          onToggleRenamer={() => setIsRenamerOpen((prev) => !prev)}
          renamerPosition={renamerPosition}
          onToggleRenamerPosition={() =>
            setRenamerPosition((prev) => (prev === "left" ? "right" : "left"))
          }
          foldersFirst={foldersFirst}
          onToggleFoldersFirst={() => setFoldersFirst((prev) => !prev)}
          selectedCount={selectedPaths.size}
          totalCount={filteredFiles.length}
          allSelected={selectedPaths.size === filteredFiles.length && filteredFiles.length > 0}
          onToggleSelectAll={toggleSelectAll}
          onOpenUniversalSearch={() => setIsUniversalSearchOpen(true)}
          onNewFolder={handleNewFolder}
          sortField={sortField}
          onSortChange={setSortField}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNewWindow={handleOpenNewWindow}
        />

        {/* Workspace Central Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto">
            {viewMode === "details" ? (
              <FileTableView
                folders={filteredFolders}
                files={filteredFiles}
                selectedPaths={selectedPaths}
                foldersFirst={foldersFirst}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onNavigateFolder={(path) => navigateTo(path)}
                onOpenFile={handleOpenFile}
                onContextMenu={handleContextMenu}
                emptyMessage={
                  currentPath === "recents"
                    ? "No recent files yet. Files you download or open in Folderly will appear here."
                    : undefined
                }
              />
            ) : (
              <FileGrid
                folders={filteredFolders}
                files={filteredFiles}
                selectedPaths={selectedPaths}
                viewMode={viewMode}
                foldersFirst={foldersFirst}
                onToggle={toggleSelect}
                onToggleAll={toggleSelectAll}
                onNavigateFolder={(path) => navigateTo(path)}
                onOpenFile={handleOpenFile}
                onContextMenu={handleContextMenu}
                sortField={sortField}
                emptyMessage={
                  currentPath === "recents"
                    ? "No recent files yet. Files you download or open in Folderly will appear here."
                    : undefined
                }
              />
            )}
          </div>

          {/* ── Right Renamer Drawer (when position is 'right') ── */}
          {isRenamerOpen && renamerPosition === "right" && renderRenamerDrawer()}
        </div>

        {/* Status Bar Footer */}
        <StatusBar
          message={status.msg}
          type={status.type}
          currentPath={currentPath}
          folderCount={filteredFolders.length}
          fileCount={filteredFiles.length}
        />
      </div>

      {/* Floating Context Menu */}
      <FileContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        targetPath={contextMenu.targetPath}
        isFolder={contextMenu.isFolder}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        onOpen={(path) => {
          if (contextMenu.isFolder) {
            navigateTo(path);
          } else {
            handleOpenFile(path);
          }
        }}
        onShowInFileManager={handleShowInFileManager}
        onDelete={handleDeleteItem}
      />

      {/* Universal Search Across Entire Laptop Modal */}
      <UniversalSearchModal
        isOpen={isUniversalSearchOpen}
        onClose={() => setIsUniversalSearchOpen(false)}
        onNavigateFolder={(path) => navigateTo(path)}
        onOpenFile={handleOpenFile}
        onShowInFileManager={handleShowInFileManager}
      />

      {/* Settings & Preferences Modal (Theme & Profile) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        detectedUser={detectedUser}
        displayName={displayName}
        onUpdateDisplayName={handleUpdateDisplayName}
        workspaceName={workspaceName}
        onUpdateWorkspaceName={handleUpdateWorkspaceName}
      />
    </div>
  );
};

export default App;
