import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-light-bg px-4 py-10 dark:bg-dark-bg"><div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" /><div className="relative w-full max-w-md"><Link href="/" className="mb-8 flex items-center justify-center gap-3"><BrandLogo className="h-10 w-10 rounded-xl shadow-lg shadow-brand-500/20" /><span className="bg-gradient-to-r from-brand-500 to-emerald-400 bg-clip-text text-2xl font-extrabold text-transparent">جاب مچ</span></Link><div className="glass-card rounded-2xl p-6 sm:p-8">{children}</div><Link href="/" className="mt-5 block text-center text-xs text-slate-400">بازگشت به صفحه اصلی</Link></div></div>;
}
