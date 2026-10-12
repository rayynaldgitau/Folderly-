import React from "react";
import type { RenameRules } from "../types";

interface Props {
  rules: RenameRules;
  onChange: (rules: RenameRules) => void;
}

/** A labelled text input. */
const TextInput: React.FC<{
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}> = ({ label, value, placeholder, onChange }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs text-neutral-400 font-medium">{label}</span>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="
        bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5
        text-sm text-white placeholder-neutral-600
        focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40
        transition-colors
      "
    />
  </label>
);

/** A labelled toggle checkbox. */
const Toggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none group">
    <div
      onClick={() => onChange(!checked)}
      className={`
        relative w-9 h-5 rounded-full border transition-colors duration-200 flex items-center
        ${checked ? "bg-violet-600 border-violet-500" : "bg-neutral-700 border-neutral-600"}
      `}
    >
      <span
        className={`
          absolute w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200
          ${checked ? "translate-x-[18px]" : "translate-x-[3px]"}
        `}
      />
    </div>
    <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">
      {label}
    </span>
  </label>
);

/**
 * Rule Builder panel.
 *
 * Renders controls for every renaming transformation and propagates
 * changes upward via the `onChange` callback.
 */
const RuleBuilder: React.FC<Props> = ({ rules, onChange }) => {
  /** Partial-update helper — avoids boilerplate in each handler. */
  const update = (partial: Partial<RenameRules>) =>
    onChange({ ...rules, ...partial });

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
        🔧 Rule Builder
      </h2>

      {/* ── Text transforms ── */}
      <section className="space-y-3">
        <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
          Text Transforms
        </p>

        <Toggle
          label="Add date prefix (YYYY-MM-DD)"
          checked={rules.add_date_prefix}
          onChange={(v) => update({ add_date_prefix: v })}
        />
        <Toggle
          label="Convert to lowercase"
          checked={rules.to_lowercase}
          onChange={(v) => update({ to_lowercase: v, to_uppercase: v ? false : rules.to_uppercase })}
        />
        <Toggle
          label="Convert to UPPERCASE"
          checked={rules.to_uppercase}
          onChange={(v) => update({ to_uppercase: v, to_lowercase: v ? false : rules.to_lowercase })}
        />
        <Toggle
          label="Trim whitespace"
          checked={rules.trim_whitespace}
          onChange={(v) => update({ trim_whitespace: v })}
        />
      </section>

      <hr className="border-neutral-800" />

      {/* ── Space replacement ── */}
      <section className="space-y-3">
        <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
          Space Replacement
        </p>
        <TextInput
          label="Replace spaces with"
          value={rules.replace_spaces_with}
          placeholder="e.g.  -  or  _"
          onChange={(v) => update({ replace_spaces_with: v })}
        />
      </section>

      <hr className="border-neutral-800" />

      {/* ── Regex find & replace ── */}
      <section className="space-y-3">
        <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
          Regex Find &amp; Replace
        </p>
        <TextInput
          label="Find (regex)"
          value={rules.find_pattern}
          placeholder="e.g.  \d{4}  or  [aeiou]"
          onChange={(v) => update({ find_pattern: v })}
        />
        <TextInput
          label="Replace with"
          value={rules.replace_pattern}
          placeholder="e.g.  $1  or leave empty"
          onChange={(v) => update({ replace_pattern: v })}
        />
      </section>

      <hr className="border-neutral-800" />

      {/* ── Strip prefix / suffix ── */}
      <section className="space-y-3">
        <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
          Strip from Name
        </p>
        <TextInput
          label="Strip prefix"
          value={rules.strip_prefix}
          placeholder="e.g.  IMG_"
          onChange={(v) => update({ strip_prefix: v })}
        />
        <TextInput
          label="Strip suffix"
          value={rules.strip_suffix}
          placeholder="e.g.  _final"
          onChange={(v) => update({ strip_suffix: v })}
        />
      </section>

      <hr className="border-neutral-800" />

      {/* ── Prepend / Append ── */}
      <section className="space-y-3">
        <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
          Add Text
        </p>
        <TextInput
          label="Prepend text"
          value={rules.prepend_text}
          placeholder="added at start"
          onChange={(v) => update({ prepend_text: v })}
        />
        <TextInput
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
