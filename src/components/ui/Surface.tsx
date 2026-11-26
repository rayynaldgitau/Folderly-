import React, { useEffect } from "react";
import { IconAlert, IconFolder, IconRefresh, IconClose } from "./Icons";
import { Button } from "./Button";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "filled" | "elevated";
  interactive?: boolean;
}

/**
 * Material 3 Card container separated by tonal surface color rather than borders.
 */
export const Card: React.FC<CardProps> = ({
  variant = "filled",
  interactive = false,
  className = "",
  children,
  ...rest
}) => {
  const variantClasses =
    variant === "elevated"
      ? "bg-surface-container-low shadow-m3-1"
      : "bg-surface-container";

  return (
    <div
      className={`rounded-m3-md ${variantClasses} ${
        interactive ? "m3-state-surface cursor-pointer" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  leadingIcon?: React.ReactNode;
}

/**
 * Material 3 Filter / Assist Chip using tonal surface separation.
 */
export const Chip: React.FC<ChipProps> = ({
  selected = false,
  leadingIcon,
  className = "",
  children,
  ...rest
}) => (
  <button
    type="button"
    aria-pressed={selected}
    className={`inline-flex items-center gap-1.5 min-h-[36px] px-3.5 rounded-m3-sm text-xs font-medium m3-pressable select-none ${
      selected
        ? "bg-secondary-container text-on-secondary-container"
        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
    } ${className}`}
    {...rest}
  >
    {leadingIcon}
    {children}
  </button>
);

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

/**
 * Material 3 Modal Dialog with scrim backdrop, tonal surface separation, and Escape dismissal.
 */
export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidthClass = "max-w-2xl",
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] flex flex-col bg-surface-container-high text-on-surface rounded-m3-xl shadow-m3-3 overflow-hidden animate-m3-dialog`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4 bg-surface-container shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-on-surface truncate">{title}</h2>
            {subtitle && (
              <p className="text-xs text-on-surface-variant truncate mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-m3-full text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface m3-pressable"
          >
            <IconClose size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export interface SnackbarProps {
  open: boolean;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

/**
 * Material 3 Snackbar using inverse-surface tokens.
 */
export const Snackbar: React.FC<SnackbarProps> = ({
  open,
  title,
  description,
  actionLabel,
  onAction,
  onDismiss,
}) => {
  if (!open) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-12 right-5 z-40 flex items-center gap-3 px-4 py-3 rounded-m3-md bg-inverse-surface text-inverse-on-surface shadow-m3-2 max-w-sm animate-m3-toast"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{title}</p>
        {description && (
          <p className="text-[11px] opacity-80 truncate">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-3 min-h-[36px] rounded-m3-full text-xs font-semibold text-inverse-primary hover:bg-white/10 m3-pressable shrink-0"
        >
          {actionLabel}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-m3-full opacity-75 hover:opacity-100 hover:bg-white/10 m3-pressable shrink-0"
        >
          <IconClose size={16} />
        </button>
      )}
    </aside>
  );
};

/**
 * Material 3 indeterminate Linear Progress Indicator.
 */
export const LinearProgress: React.FC<{ label?: string }> = ({
  label = "Loading",
}) => (
  <div
    role="progressbar"
    aria-label={label}
    className="w-full h-1 bg-surface-container-highest overflow-hidden shrink-0"
  >
    <div className="h-full w-1/2 bg-primary rounded-m3-full animate-m3-progress" />
  </div>
);

export interface StateViewProps {
  kind: "loading" | "empty" | "error";
  title: string;
  description?: string;
  onRetry?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Unified Empty / Loading / Error state view for data regions.
 */
export const StateView: React.FC<StateViewProps> = ({
  kind,
  title,
  description,
  onRetry,
  actionLabel,
  onAction,
}) => {
  if (kind === "loading") {
    return (
      <div className="p-6 space-y-4" aria-busy="true" aria-label={title}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 rounded-m3-md bg-surface-container animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div
        className={`w-14 h-14 rounded-m3-lg flex items-center justify-center mb-4 ${
          kind === "error"
            ? "bg-error-container text-on-error-container"
            : "bg-secondary-container text-on-secondary-container"
        }`}
      >
        {kind === "error" ? <IconAlert size={26} /> : <IconFolder size={26} />}
      </div>
      <h3 className="text-base font-semibold text-on-surface mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-on-surface-variant max-w-md mb-4">
          {description}
        </p>
      )}
      {kind === "error" && (onRetry || (actionLabel && onAction)) && (
        <div className="flex items-center gap-2">
          {actionLabel && onAction && (
            <Button variant="filled" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {onRetry && (
            <Button
              variant="tonal"
              leadingIcon={<IconRefresh size={16} />}
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
