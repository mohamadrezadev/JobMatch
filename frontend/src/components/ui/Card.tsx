import { clsx } from "clsx";
import { HTMLAttributes } from "react";
export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "glass-card rounded-3xl border border-slate-200 bg-light-surface p-5 sm:p-6 dark:border-dark-border dark:bg-dark-surface",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
