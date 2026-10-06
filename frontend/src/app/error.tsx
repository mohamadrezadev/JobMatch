"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      className="mx-auto my-12 max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-dark-border dark:bg-dark-surface"
    >
      <h1 className="text-xl font-black">این صفحه درست بارگذاری نشد</h1>
      <p className="mt-4 text-sm leading-7 text-slate-500">
        دوباره تلاش کن. اگر نسخه قدیمی برنامه باز مانده است، صفحه را دوباره
        بارگذاری کن.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-brand-500 px-5 py-3 text-sm text-white"
        >
          تلاش دوباره
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm dark:border-dark-border"
        >
          بارگذاری مجدد
        </button>
      </div>
    </section>
  );
}
