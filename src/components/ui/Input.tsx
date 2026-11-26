import React from "react";

export interface OutlinedTextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  errorText?: string;
  leadingIcon?: React.ReactNode;
}

/**
 * Material 3 Outlined Text Field with token-backed outline,
 * accessible label association, and 48px minimum target height.
 */
export const OutlinedTextField: React.FC<OutlinedTextFieldProps> = ({
  label,
  value,
  onChange,
  helperText,
  errorText,
  leadingIcon,
  className = "",
  id,
  ...rest
}) => {
  const inputId = id || `m3-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const hasError = Boolean(errorText);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={inputId}
        className="text-xs font-medium text-on-surface-variant"
      >
        {label}
      </label>
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="absolute left-3 text-on-surface-variant pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={hasError || undefined}
          className={`w-full min-h-[44px] rounded-m3-sm bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant/60 border transition-colors ${
            leadingIcon ? "pl-10 pr-3" : "px-3.5"
          } ${
            hasError
              ? "border-error focus:border-error"
              : "border-outline-variant focus:border-primary"
          } focus:outline-none`}
          {...rest}
        />
      </div>
      {(errorText || helperText) && (
        <p className={`text-xs ${hasError ? "text-error" : "text-on-surface-variant"}`}>
          {errorText || helperText}
        </p>
      )}
    </div>
  );
};

export interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

/**
 * Material 3 Switch control with accessible `role="switch"` and 48px min row height.
 */
export const Switch: React.FC<SwitchProps> = ({
  label,
  checked,
  onChange,
  description,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="w-full min-h-[48px] flex items-center justify-between gap-3 px-2 py-1.5 rounded-m3-md text-left hover:bg-surface-container-high/60 transition-colors select-none"
  >
    <span className="flex flex-col min-w-0">
      <span className="text-sm font-medium text-on-surface">{label}</span>
      {description && (
        <span className="text-xs text-on-surface-variant">{description}</span>
      )}
    </span>
    <span
      aria-hidden="true"
      className={`relative shrink-0 w-[52px] h-[32px] rounded-m3-full border-2 transition-colors duration-200 flex items-center ${
        checked
          ? "bg-primary border-primary"
          : "bg-surface-container-highest border-outline"
      }`}
    >
      <span
        className={`rounded-m3-full transition-transform duration-200 ease-emil-out ${
          checked
            ? "w-6 h-6 bg-on-primary translate-x-[22px]"
            : "w-4 h-4 bg-outline translate-x-[6px]"
        }`}
      />
    </span>
  </button>
);
