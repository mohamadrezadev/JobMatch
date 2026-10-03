import { clsx } from 'clsx';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'brand';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  brand: 'bg-brand-100 text-brand-700',
};

export function Badge({ children, variant = 'default' }: Props) {
  return <span className={clsx('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', styles[variant])}>{children}</span>;
}
