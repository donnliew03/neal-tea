import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  loading?: boolean;
}

const VARIANTS: Record<string, string> = {
  primary:
    "bg-matcha-600 text-cream-50 hover:bg-matcha-700 shadow-soft hover:shadow-lift active:scale-[0.98]",
  secondary:
    "bg-cream-100 text-matcha-800 border-2 border-matcha-300 hover:bg-cream-200 active:scale-[0.98]",
  ghost: "bg-transparent text-matcha-700 hover:bg-matcha-50 active:scale-[0.98]",
  danger: "bg-blossom-600 text-white hover:bg-blossom-700 shadow-soft active:scale-[0.98]",
};

const SIZES: Record<string, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  loading,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-display font-bold tracking-wide
        transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
