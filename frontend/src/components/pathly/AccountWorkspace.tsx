import type { ReactNode } from "react";
import { Icon } from "./Icon";

export const accountField =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-dark-border dark:bg-dark-card dark:text-slate-100";
export function WorkspaceHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5 pb-2">
      <div className="max-w-2xl">
        <p className="mb-3 text-xs font-bold text-brand-500">{eyebrow}</p>
        <h1 className="text-2xl font-black leading-relaxed sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}
export function WorkspaceSection({
  title,
  description,
  icon,
  children,
  id,
}: {
  title: string;
  description: string;
  icon: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="min-w-0 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 dark:border-dark-border dark:bg-dark-surface sm:p-7"
    >
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
          <Icon name={icon} />
        </span>
        <div>
          <h2 className="text-sm font-extrabold">{title}</h2>
          <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}
