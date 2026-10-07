import { clsx } from "clsx";
import { ButtonHTMLAttributes } from "react";
import { LoadingSpinner } from "./LoadingState";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: Props) {
  const variants = {
    primary:
      "bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600",
    secondary:
      "border border-slate-200 bg-slate-100 text-slate-700 dark:border-dark-border dark:bg-dark-card dark:text-slate-300",
    ghost:
      "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-dark-card",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-xs",
    lg: "px-6 py-3 text-sm",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <LoadingSpinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
