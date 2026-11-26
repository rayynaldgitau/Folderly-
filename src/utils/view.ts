import type { ViewMode } from "../types";

export const VIEW_MODE_STORAGE_KEY = "foldy_view_mode";
export const DETAILS_PANE_STORAGE_KEY = "foldy_details_pane";
export const PREVIEW_PANE_STORAGE_KEY = "foldy_preview_pane";
export const EXPERIMENTAL_NODE_VIEW_STORAGE_KEY = "foldy_exp_node_view";

export type IconGridSize = "extra_large" | "large" | "medium" | "small";

export interface ViewOption {
  mode: ViewMode;
  label: string;
  group: "icons" | "layouts" | "experimental";
}

export const VIEW_OPTIONS: ReadonlyArray<ViewOption> = [
  { mode: "extra_large_icons", label: "Extra large icons", group: "icons" },
  { mode: "large_icons", label: "Large icons", group: "icons" },
  { mode: "medium_icons", label: "Medium icons", group: "icons" },
  { mode: "small_icons", label: "Small icons", group: "icons" },
  { mode: "list", label: "List", group: "layouts" },
  { mode: "details", label: "Details", group: "layouts" },
  { mode: "tiles", label: "Tiles", group: "layouts" },
  { mode: "content", label: "Content", group: "layouts" },
];

export const NODE_VIEW_OPTION: ViewOption = {
  mode: "node",
  label: "Node view",
  group: "experimental",
};

/**
 * Returns the list of View menu options, including experimental Node view only when enabled.
 *
 * @param nodeViewEnabled - Whether the experimental Node view toggle is on.
 * @returns Ordered list of ViewOption entries.
 */
export function getViewOptions(nodeViewEnabled: boolean): ReadonlyArray<ViewOption> {
  return nodeViewEnabled ? [...VIEW_OPTIONS, NODE_VIEW_OPTION] : VIEW_OPTIONS;
}

export const VIEW_LABELS: Record<ViewMode, string> = {
  extra_large_icons: "Extra large icons",
  large_icons: "Large icons",
  medium_icons: "Medium icons",
  small_icons: "Small icons",
  list: "List",
  details: "Details",
  tiles: "Tiles",
  content: "Content",
  node: "Node view",
};

const VALID_VIEW_MODES = new Set<string>(VIEW_OPTIONS.map((o) => o.mode));

/**
 * Parses a persisted view mode string from localStorage, migrating legacy
 * `"grid"` / `"cards"` values to `"medium_icons"` and defaulting to `"details"`.
 *
 * @param raw - Raw string from localStorage.
 * @param nodeViewEnabled - Whether the experimental Node view is enabled.
 * @returns Valid ViewMode.
 */
export function parseViewMode(raw: string | null, nodeViewEnabled = false): ViewMode {
  if (raw === "node") {
    return nodeViewEnabled ? "node" : "details";
  }
  if (raw && VALID_VIEW_MODES.has(raw)) {
    return raw as ViewMode;
  }
  if (raw === "grid" || raw === "cards") {
    return "medium_icons";
  }
  if (raw === "table") {
    return "details";
  }
  return "details";
}

/**
 * Maps an icon-based ViewMode to its grid size parameter, or null for non-icon views.
 *
 * @param mode - Active ViewMode.
 * @returns IconGridSize or null.
 */
export function getIconGridSize(mode: ViewMode): IconGridSize | null {
  switch (mode) {
    case "extra_large_icons":
      return "extra_large";
    case "large_icons":
      return "large";
    case "medium_icons":
      return "medium";
    case "small_icons":
      return "small";
    default:
      return null;
  }
}

/**
 * Derives a human-readable file type label from an extension or folder flag.
 *
 * @param isFolder - Whether the entry is a folder.
 * @param extension - File extension without leading dot.
 * @returns Human-readable type label.
 */
export function formatFileType(isFolder: boolean, extension?: string): string {
  if (isFolder) return "File folder";
  const ext = (extension || "").trim().toUpperCase();
  return ext ? `${ext} File` : "File";
}
