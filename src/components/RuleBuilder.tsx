import React from "react";
import type { RenameRules } from "../types";
import { IconSliders, OutlinedTextField, Switch } from "./ui";

interface Props {
  rules: RenameRules;
  onChange: (rules: RenameRules) => void;
}

/**
 * Material 3 Rule Builder panel for Bulk Renamer transformations.
 */
const RuleBuilder: React.FC<Props> = ({ rules, onChange }) => {
  const update = (partial: Partial<RenameRules>) =>
    onChange({ ...rules, ...partial });

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <IconSliders size={16} className="text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-wider">Rule Builder</h3>
      </div>

      {/* Text transforms */}
      <section className="space-y-1">
        <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">
          Text Transforms
        </p>

        <Switch
          label="Add date prefix (YYYY-MM-DD)"
          checked={rules.add_date_prefix}
          onChange={(v) => update({ add_date_prefix: v })}
        />
        <Switch
          label="Convert to lowercase"
          checked={rules.to_lowercase}
          onChange={(v) =>
            update({ to_lowercase: v, to_uppercase: v ? false : rules.to_uppercase })
          }
        />
        <Switch
          label="Convert to UPPERCASE"
          checked={rules.to_uppercase}
          onChange={(v) =>
            update({ to_uppercase: v, to_lowercase: v ? false : rules.to_lowercase })
          }
        />
        <Switch
          label="Trim whitespace"
          checked={rules.trim_whitespace}
          onChange={(v) => update({ trim_whitespace: v })}
        />
      </section>

      {/* Space replacement */}
      <section className="space-y-3 pt-2">
        <p className="text-xs text-primary font-semibold uppercase tracking-wider">
          Space Replacement
        </p>
        <OutlinedTextField
          label="Replace spaces with"
          value={rules.replace_spaces_with}
          placeholder="e.g. - or _"
          onChange={(v) => update({ replace_spaces_with: v })}
        />
      </section>

      {/* Regex find & replace */}
      <section className="space-y-3 pt-2">
        <p className="text-xs text-primary font-semibold uppercase tracking-wider">
          Regex Find &amp; Replace
        </p>
        <OutlinedTextField
          label="Find (regex)"
          value={rules.find_pattern}
          placeholder="e.g. \\d{4} or [aeiou]"
          onChange={(v) => update({ find_pattern: v })}
        />
        <OutlinedTextField
          label="Replace with"
          value={rules.replace_pattern}
          placeholder="e.g. $1 or leave empty"
          onChange={(v) => update({ replace_pattern: v })}
        />
      </section>

      {/* Strip prefix / suffix */}
      <section className="space-y-3 pt-2">
        <p className="text-xs text-primary font-semibold uppercase tracking-wider">
          Strip from Name
        </p>
        <OutlinedTextField
          label="Strip prefix"
          value={rules.strip_prefix}
          placeholder="e.g. IMG_"
          onChange={(v) => update({ strip_prefix: v })}
        />
        <OutlinedTextField
          label="Strip suffix"
          value={rules.strip_suffix}
          placeholder="e.g. _final"
          onChange={(v) => update({ strip_suffix: v })}
        />
      </section>

      {/* Prepend / Append */}
      <section className="space-y-3 pt-2">
        <p className="text-xs text-primary font-semibold uppercase tracking-wider">
          Add Text
        </p>
        <OutlinedTextField
          label="Prepend text"
          value={rules.prepend_text}
          placeholder="added at start"
          onChange={(v) => update({ prepend_text: v })}
        />
        <OutlinedTextField
          label="Append text"
          value={rules.append_text}
          placeholder="added at end"
          onChange={(v) => update({ append_text: v })}
        />
      </section>
    </div>
  );
};

export default RuleBuilder;
