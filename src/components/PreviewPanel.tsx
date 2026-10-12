import React from "react";
import type { RenamePreview } from "../types";

interface Props {
  previews: RenamePreview[];
}

/**
 * Truncates a file path to show only the last two segments for readability.
 */
function shortPath(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/");
  return parts.slice(-2).join("/");
}

/**
 * Side-by-side diff panel showing original → new file names.
 *
 * - Green rows: safe rename
 * - Yellow rows: no-op (name unchanged)
 * - Red rows: conflict or error
 */
const PreviewPanel: React.FC<Props> = ({ previews }) => {
  const changed   = previews.filter((p) => p.original_path !== p.new_path && !p.new_path.startsWith("ERROR:") && !p.conflict);
  const noOp      = previews.filter((p) => p.original_path === p.new_path);
  const conflicts = previews.filter((p) => p.conflict || p.new_path.startsWith("ERROR:"));

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">
        👁 Preview Diff
      </h2>

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap">
        <span className="badge badge-green">{changed.length} renamed</span>
        <span className="badge badge-yellow">{noOp.length} unchanged</span>
        {conflicts.length > 0 && (
          <span className="badge badge-red">{conflicts.length} conflict(s)</span>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-500 uppercase tracking-widest font-semibold px-1">
        <span>Original</span>
        <span>New name</span>
      </div>

      {/* Diff rows */}
      <div className="space-y-1">
        {/* Conflicts first */}
        {conflicts.map((p) => (
          <DiffRow key={p.original_path} preview={p} type="conflict" />
        ))}
        {/* Actual changes */}
        {changed.map((p) => (
          <DiffRow key={p.original_path} preview={p} type="changed" />
        ))}
        {/* No-ops */}
        {noOp.map((p) => (
          <DiffRow key={p.original_path} preview={p} type="noop" />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

type RowType = "changed" | "noop" | "conflict";

const ROW_STYLES: Record<RowType, string> = {
  changed:  "bg-emerald-950/40 border border-emerald-800/40",
  noop:     "bg-neutral-800/50 border border-neutral-700/40",
  conflict: "bg-red-950/40    border border-red-800/40",
};

const OLD_STYLES: Record<RowType, string> = {
  changed:  "text-neutral-300 line-through decoration-red-500",
  noop:     "text-neutral-400",
  conflict: "text-red-300 line-through decoration-red-500",
};

const NEW_STYLES: Record<RowType, string> = {
  changed:  "text-emerald-300 font-semibold",
  noop:     "text-neutral-500",
  conflict: "text-red-400 italic",
};

interface DiffRowProps {
  preview: RenamePreview;
  type: RowType;
}

/**
 * A single row in the diff panel showing the before and after filenames.
 */
const DiffRow: React.FC<DiffRowProps> = ({ preview, type }) => {
  const originalName = shortPath(preview.original_path);
  const newName      = preview.new_path.startsWith("ERROR:")
    ? preview.new_path
    : shortPath(preview.new_path);

  return (
    <div
      className={`grid grid-cols-2 gap-2 rounded-lg px-3 py-2 ${ROW_STYLES[type]}`}
      title={`${preview.original_path} → ${preview.new_path}`}
    >
      <p className={`text-xs truncate ${OLD_STYLES[type]}`}>{originalName}</p>
      <div className="flex items-center gap-1 min-w-0">
        {type === "changed" && <span className="text-[10px] text-emerald-600 shrink-0">→</span>}
        {type === "conflict" && <span className="text-[10px] text-red-500 shrink-0">⚠</span>}
        <p className={`text-xs truncate ${NEW_STYLES[type]}`}>{newName}</p>
      </div>
    </div>
  );
};

export default PreviewPanel;
