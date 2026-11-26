import React from "react";

export type ButtonVariant = "filled" | "tonal" | "outlined" | "text" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  filled: "bg-primary text-on-primary hover:brightness-105",
  tonal: "bg-secondary-container text-on-secondary-container hover:bg-surface-container-highest",
  outlined: "bg-transparent text-primary border border-outline hover:bg-primary/10",
  text: "bg-transparent text-primary hover:bg-primary/10",
  danger: "bg-error-container text-on-error-container hover:brightness-105",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-[40px] px-4 text-xs gap-2",
  md: "min-h-[48px] px-5 text-sm gap-2",
};

/**
 * Material 3 Button primitive with tactile press feedback (scale 0.97).
 */
export const Button: React.FC<ButtonProps> = ({
  variant = "filled",
  size = "sm",
  leadingIcon,
  className = "",
  children,
  ...rest
}) => (
  <button
    className={`inline-flex items-center justify-center rounded-m3-full font-medium m3-pressable select-none disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    {...rest}
  >
    {leadingIcon && <span className="shrink-0 flex items-center">{leadingIcon}</span>}
    {children}
  </button>
);

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  variant?: "standard" | "tonal" | "filled";
}

/**
 * Material 3 IconButton enforcing a 48x48px minimum touch target.
 */
export const IconButton: React.FC<IconButtonProps> = ({
  label,
  active = false,
  variant = "standard",
  className = "",
  children,
  ...rest
}) => {
  const style =
    variant === "filled"
      ? "bg-primary text-on-primary"
      : variant === "tonal" || active
      ? "bg-primary-container text-on-primary-container"
      : "bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface";

  return (
    <button
      type="button"
      aria-label={label}
      title={rest.title || label}
      aria-pressed={active || undefined}
      className={`inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-m3-full m3-pressable select-none disabled:opacity-35 disabled:cursor-not-allowed ${style} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
  extended?: boolean;
}

/**
 * Material 3 Floating Action Button (standard or extended).
 */
export const Fab: React.FC<FabProps> = ({
  label,
  icon,
  extended = false,
  className = "",
  ...rest
}) => (
  <button
    type="button"
    aria-label={label}
    className={`inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary-container shadow-m3-2 hover:shadow-m3-3 rounded-m3-lg font-medium text-sm m3-pressable select-none ${
      extended ? "h-12 px-4" : "w-14 h-14"
    } ${className}`}
    {...rest}
  >
    {icon}
    {extended && <span>{label}</span>}
  </button>
);
