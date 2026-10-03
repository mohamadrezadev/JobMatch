import { clsx } from 'clsx';
import { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export function Input({ error, label, className, ...props }: Props) {
  return (
    <div className="w-full">
      {label && <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={clsx(
          'w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-brand-500 focus:ring-brand-200',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
