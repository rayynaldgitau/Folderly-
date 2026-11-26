import React from "react";
import type { RenamePreview } from "../types";
import { IconAlert, IconArrowRight, IconEye } from "./ui";

interface Props {
  previews: RenamePreview[];
}

function shortPath(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/");
  return parts.slice(-2).join("/");
}

/**
 * Side-by-side diff panel showing original to new file names using M3 semantic tokens.
 */
const PreviewPanel: React.FC<Props> = ({ previews }) => {
  const changed = previews.filter(
    (p) =>
      p.original_path !== p.new_path &&
      !p.new_path.startsWith("ERROR:") &&
      !p.conflict
  );
  const noOp = previews.filter((p) => p.original_path === p.new_path);
  const conflicts = previews.filter(
    (p) => p.conflict || p.new_path.startsWith("ERROR:")
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <IconEye size={16} className="text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-wider">Preview Diff</h3>
      </div>

      <div className="flex gap-2 flex-wrap">
        <span className="badge badge-green">{changed.length} renamed</span>
        <span className="badge badge-yellow">{noOp.length} unchanged</span>
        {conflicts.length > 0 && (
          <span className="badge badge-red">{conflicts.length} conflict(s)</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold px-1">
        <span>Original</span>
        <span>New name</span>
      </div>

      <div className="space-y-1.5">
        {conflicts.map((p) => (
          <DiffRow key={p.original_path} preview={p} type="conflict" />
        ))}
        {changed.map((p) => (
          <DiffRow key={p.original_path} preview={p} type="changed" />
        ))}
        {noOp.map((p) => (
          <DiffRow key={p.original_path} preview={p} type="noop" />
        ))}
      </div>
    </div>
  );
};

type RowType = "changed" | "noop" | "conflict";

const ROW_STYLES: Record<RowType, string> = {
  changed: "bg-success-container/60",
  noop: "bg-surface-container",
  conflict: "bg-error-container/70",
};

const OLD_STYLES: Record<RowType, string> = {
  changed: "text-on-surface-variant line-through",
  noop: "text-on-surface-variant",
  conflict: "text-on-error-container line-through",
};

const NEW_STYLES: Record<RowType, string> = {
  changed: "text-success font-semibold",
  noop: "text-on-surface-variant",
  conflict: "text-error font-medium",
};

interface DiffRowProps {
  preview: RenamePreview;
  type: RowType;
}

const DiffRow: React.FC<DiffRowProps> = ({ preview, type }) => {
  const originalName = shortPath(preview.original_path);
  const newName = preview.new_path.startsWith("ERROR:")
    ? preview.new_path
    : shortPath(preview.new_path);

  return (
    <div
      className={`grid grid-cols-2 gap-2 rounded-m3-sm px-3 py-2 ${ROW_STYLES[type]}`}
      title={`${preview.original_path} -> ${preview.new_path}`}
    >
      <p className={`text-xs truncate ${OLD_STYLES[type]}`}>{originalName}</p>
      <div className="flex items-center gap-1.5 min-w-0">
        {type === "changed" && (
          <IconArrowRight size={12} className="text-success shrink-0" />
        )}
        {type === "conflict" && (
          <IconAlert size={12} className="text-error shrink-0" />
        )}
        <p className={`text-xs truncate ${NEW_STYLES[type]}`}>{newName}</p>
      </div>
    </div>
  );
};

export default PreviewPanel;
