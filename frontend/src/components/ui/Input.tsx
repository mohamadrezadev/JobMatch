import { clsx } from 'clsx';
import { InputHTMLAttributes, useId } from 'react';
interface Props extends InputHTMLAttributes<HTMLInputElement> { error?: string; label?: string }
export function Input({ error, label, className, id, ...props }: Props) {
  const generatedId = useId(); const inputId = id ?? generatedId;
  return <div className="w-full">{label && <label htmlFor={inputId} className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</label>}<input id={inputId} aria-invalid={Boolean(error)} aria-describedby={error ? inputId + '-error' : undefined} className={clsx('w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-xs text-slate-800 transition-colors focus:outline-none focus:ring-2 dark:bg-dark-card dark:text-slate-100', error ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-dark-border', className)} {...props} />{error && <p id={inputId + '-error'} className="mt-1 text-xs text-rose-500">{error}</p>}</div>;
}
