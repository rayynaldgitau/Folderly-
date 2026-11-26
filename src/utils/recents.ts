import type { FileEntry } from "../types";

export const RECENTS_STORAGE_KEY = "foldy_recent_opened";
const LEGACY_RECENTS_STORAGE_KEY = "folderly_recent_opened";
export const MAX_RECENT_FILES = 50;

/** Persisted metadata for a file opened by the user. */
export interface RecentFileRecord {
  path: string;
  name: string;
  /** File extension / type without leading dot, lowercased. */
  extension: string;
  size: number;
  /** ISO-8601 timestamp when the file was last opened. */
  opened_at: string;
}

/**
 * Reads and normalizes recent file records from localStorage, ordered most-recent-first
 * and capped at MAX_RECENT_FILES. Migrates legacy storage key if needed.
 *
 * @returns Ordered list of persisted recent file records.
 */
export function readRecentFiles(): RecentFileRecord[] {
  try {
    const rawPrimary = localStorage.getItem(RECENTS_STORAGE_KEY);
    const rawLegacy = localStorage.getItem(LEGACY_RECENTS_STORAGE_KEY);
    const raw = rawPrimary ?? rawLegacy;
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const normalized: RecentFileRecord[] = [];
    for (const item of parsed) {
      if (!item || typeof item.path !== "string" || !item.path.trim()) continue;
      const key = item.path.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const name =
        typeof item.name === "string" && item.name
          ? item.name
          : item.path.split(/[\\/]/).pop() || "File";
      const extension =
        typeof item.extension === "string"
          ? item.extension.toLowerCase()
          : name.includes(".")
          ? name.split(".").pop()?.toLowerCase() || ""
          : "";

      normalized.push({
        path: item.path,
        name,
        extension,
        size: typeof item.size === "number" && Number.isFinite(item.size) ? item.size : 0,
        opened_at:
          typeof item.opened_at === "string" && item.opened_at
            ? item.opened_at
            : new Date(0).toISOString(),
      });
    }

    normalized.sort((a, b) => b.opened_at.localeCompare(a.opened_at));
    const capped = normalized.slice(0, MAX_RECENT_FILES);

    // Persist under primary key if migrating from legacy key
    if (!rawPrimary && rawLegacy) {
      writeRecentFiles(capped);
    }

    return capped;
  } catch {
    return [];
  }
}

/**
 * Writes the given recent file records to localStorage under the canonical key.
 *
 * @param records - Ordered list of recent file records to persist.
 */
export function writeRecentFiles(records: RecentFileRecord[]): void {
  try {
    localStorage.setItem(
      RECENTS_STORAGE_KEY,
      JSON.stringify(records.slice(0, MAX_RECENT_FILES))
    );
  } catch {
    // Non-critical storage failure
  }
}

/**
 * Records an opened file at the top of the recents list, deduplicating by path
 * and capping at MAX_RECENT_FILES.
 *
 * @param filePath - Absolute path of the opened file.
 * @param existingFile - Optional FileEntry metadata if already loaded in view.
 * @returns Updated ordered list of recent file records.
 */
export function recordRecentFileEntry(
  filePath: string,
  existingFile?: FileEntry
): RecentFileRecord[] {
  const current = readRecentFiles();
  const prevMatch = current.find(
    (item) => item.path.toLowerCase() === filePath.toLowerCase()
  );

  const name =
    existingFile?.name ||
    prevMatch?.name ||
    filePath.split(/[\\/]/).pop() ||
    "File";
  const extension = (
    existingFile?.extension ??
    prevMatch?.extension ??
    (name.includes(".") ? name.split(".").pop() || "" : "")
  ).toLowerCase();
  const size = existingFile?.size ?? prevMatch?.size ?? 0;
  const opened_at = new Date().toISOString();

  const deduped = current.filter(
    (item) => item.path.toLowerCase() !== filePath.toLowerCase()
  );
  const updated = [{ path: filePath, name, extension, size, opened_at }, ...deduped].slice(
    0,
    MAX_RECENT_FILES
  );

  writeRecentFiles(updated);
  return updated;
}

/**
 * Removes missing (moved or deleted) entries based on a parallel existence mask
 * and persists the pruned list if any entries were removed.
 *
 * @param records - Current recent file records.
 * @param existsMask - Boolean array matching `records` by index.
 * @returns Object containing `kept` records and `removedCount`.
 */
export function filterExistingRecentFiles(
  records: RecentFileRecord[],
  existsMask: boolean[]
): { kept: RecentFileRecord[]; removedCount: number } {
  const kept = records.filter((_, idx) => existsMask[idx] !== false);
  const removedCount = records.length - kept.length;
  if (removedCount > 0) {
    writeRecentFiles(kept);
  }
  return { kept, removedCount };
}

/**
 * Removes a single file path from recents (e.g. when opening a moved/deleted file fails).
 *
 * @param filePath - Path to remove from recents.
 * @returns Updated list of recent file records.
 */
export function removeRecentFilePath(filePath: string): RecentFileRecord[] {
  const current = readRecentFiles();
  const updated = current.filter(
    (item) => item.path.toLowerCase() !== filePath.toLowerCase()
  );
  if (updated.length !== current.length) {
    writeRecentFiles(updated);
  }
  return updated;
}

/**
 * Clears all persisted recent file records.
 */
export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(RECENTS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_RECENTS_STORAGE_KEY);
  } catch {
    // Non-critical storage failure
  }
}

/**
 * Converts RecentFileRecord items into FileEntry items for the workspace views.
 *
 * @param records - Recent file records ordered most-recent-first.
 * @returns FileEntry array preserving order.
 */
export function recentRecordsToFileEntries(records: RecentFileRecord[]): FileEntry[] {
  return records.map((item) => ({
    path: item.path,
    name: item.name,
    extension: item.extension,
    size: item.size,
    created_at: item.opened_at,
    modified_at: item.opened_at,
    added_at: item.opened_at,
  }));
}
