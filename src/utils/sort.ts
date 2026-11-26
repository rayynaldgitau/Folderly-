import type { FileEntry, FolderEntry, SortDirection, SortField } from "../types";

export const SORT_FIELD_STORAGE_KEY = "foldy_sort_field";
export const SORT_DIRECTION_STORAGE_KEY = "foldy_sort_direction";

export const SORT_OPTIONS: ReadonlyArray<{ field: SortField; label: string }> = [
  { field: "name", label: "Name" },
  { field: "date_modified", label: "Date modified" },
  { field: "date_created", label: "Date created" },
  { field: "date_added", label: "Date added" },
  { field: "type", label: "File type" },
  { field: "size", label: "Size" },
];

export const SORT_LABELS: Record<SortField, string> = {
  name: "Name",
  date_modified: "Date modified",
  date_created: "Date created",
  date_added: "Date added",
  type: "File type",
  size: "Size",
};

const NATURAL_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

/**
 * Compares two strings using case-insensitive natural number ordering
 * (e.g., "file2" < "file10", "Alpha" == "alpha").
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns Negative if a < b, positive if a > b, 0 if equal.
 */
export function naturalCompare(a: string, b: string): number {
  return NATURAL_COLLATOR.compare(a, b);
}

/**
 * Parses a persisted sort field, migrating legacy `"date"` to `"date_modified"`.
 *
 * @param raw - Raw string from localStorage.
 * @returns Valid SortField, defaulting to `"name"`.
 */
export function parseSortField(raw: string | null): SortField {
  if (raw === "date") return "date_modified";
  if (
    raw === "name" ||
    raw === "date_modified" ||
    raw === "date_created" ||
    raw === "date_added" ||
    raw === "type" ||
    raw === "size"
  ) {
    return raw;
  }
  return "name";
}

/**
 * Parses a persisted sort direction.
 *
 * @param raw - Raw string from localStorage.
 * @returns `"asc"` or `"desc"`, defaulting to `"asc"`.
 */
export function parseSortDirection(raw: string | null): SortDirection {
  return raw === "desc" ? "desc" : "asc";
}

/**
 * Compares two ISO-8601 timestamp strings, pushing missing/"unknown" values last
 * regardless of direction so valid dates stay grouped together.
 */
function compareTimestamps(a: string | undefined, b: string | undefined, dir: number): number {
  const validA = Boolean(a && a !== "unknown");
  const validB = Boolean(b && b !== "unknown");
  if (!validA && !validB) return 0;
  if (!validA) return 1;
  if (!validB) return -1;
  return dir * (a as string).localeCompare(b as string);
}

/**
 * Returns a new sorted array of folders using the chosen field and direction,
 * with stable ties broken by case-insensitive natural name order.
 *
 * @param folders - Folder entries to sort.
 * @param field - Active sort field.
 * @param direction - Active sort direction (`"asc"` or `"desc"`).
 * @returns New sorted array of FolderEntry items.
 */
export function sortFolders(
  folders: readonly FolderEntry[],
  field: SortField,
  direction: SortDirection
): FolderEntry[] {
  const dir = direction === "asc" ? 1 : -1;
  return folders
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      let cmp = 0;
      if (field === "name") {
        cmp = dir * naturalCompare(a.item.name, b.item.name);
      } else if (field === "date_modified") {
        cmp = compareTimestamps(a.item.modified_at, b.item.modified_at, dir);
      } else if (field === "date_created") {
        cmp = compareTimestamps(a.item.created_at, b.item.created_at, dir);
      } else if (field === "date_added") {
        cmp = compareTimestamps(a.item.added_at, b.item.added_at, dir);
      }
      // Ties (including "type" and "size" for folders) break by natural name, then original index
      if (cmp === 0 && field !== "name") {
        cmp = naturalCompare(a.item.name, b.item.name);
      }
      return cmp !== 0 ? cmp : a.index - b.index;
    })
    .map(({ item }) => item);
}

/**
 * Returns a new sorted array of files using the chosen field and direction,
 * with stable ties broken by case-insensitive natural name order.
 *
 * @param files - File entries to sort.
 * @param field - Active sort field.
 * @param direction - Active sort direction (`"asc"` or `"desc"`).
 * @returns New sorted array of FileEntry items.
 */
export function sortFiles(
  files: readonly FileEntry[],
  field: SortField,
  direction: SortDirection
): FileEntry[] {
  const dir = direction === "asc" ? 1 : -1;
  return files
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      let cmp = 0;
      if (field === "name") {
        cmp = dir * naturalCompare(a.item.name, b.item.name);
      } else if (field === "date_modified") {
        cmp = compareTimestamps(a.item.modified_at, b.item.modified_at, dir);
      } else if (field === "date_created") {
        cmp = compareTimestamps(a.item.created_at, b.item.created_at, dir);
      } else if (field === "date_added") {
        cmp = compareTimestamps(a.item.added_at, b.item.added_at, dir);
      } else if (field === "type") {
        cmp = dir * naturalCompare(a.item.extension || "", b.item.extension || "");
      } else if (field === "size") {
        cmp = dir * (a.item.size - b.item.size);
      }

      if (cmp === 0 && field !== "name") {
        cmp = naturalCompare(a.item.name, b.item.name);
      }
      return cmp !== 0 ? cmp : a.index - b.index;
    })
    .map(({ item }) => item);
}
