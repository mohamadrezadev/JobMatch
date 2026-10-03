import { clsx } from 'clsx';
import { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: Props) {
  return (
    <div className={clsx('rounded-xl border border-gray-200 bg-white p-6 shadow-sm', className)} {...props}>
      {children}
    </div>
  );
}
