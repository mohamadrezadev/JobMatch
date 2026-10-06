import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-light-bg px-4 py-10 dark:bg-dark-bg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl"
      />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          aria-label="کارمچ، صفحه اصلی"
          className="mb-8 flex justify-center"
        >
          <BrandLogo variant="vertical" className="w-48 sm:w-56" priority />
        </Link>
        <div className="glass-card rounded-2xl p-6 sm:p-8">{children}</div>
        <Link
          href="/"
          className="mt-5 block text-center text-xs text-slate-400"
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </div>
  );
}
