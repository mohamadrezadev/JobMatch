"use client";

export function JobsPagination({
  page,
  pages,
  loading,
  onPage,
}: {
  page: number;
  pages: number;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  if (pages <= 1) return null;
  const visible = Array.from(
    new Set(
      [1, pages, page - 1, page, page + 1].filter(
        (number) => number >= 1 && number <= pages,
      ),
    ),
  ).sort((a, b) => a - b);
  const buttonClass =
    "min-h-11 min-w-11 rounded-xl border border-slate-300 px-3 text-xs font-semibold transition hover:border-brand-500 hover:bg-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-transparent dark:border-slate-600";
  return (
    <nav
      aria-label="صفحه‌بندی فرصت‌ها"
      className="space-y-3 rounded-2xl border border-slate-200 bg-light-surface p-3 dark:border-dark-border dark:bg-dark-surface"
    >
      <p
        aria-live="polite"
        aria-atomic="true"
        className="text-center text-xs text-slate-600 dark:text-slate-300"
      >
        صفحه {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}
      </p>
      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:justify-center">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPage(page - 1)}
          className={`${buttonClass} order-2 sm:order-1`}
        >
          صفحه قبل
        </button>
        <div className="order-1 col-span-2 flex flex-wrap items-center justify-center gap-1.5 sm:order-2">
          {visible.map((number, index) => (
            <span key={number} className="inline-flex items-center gap-1.5">
              {index > 0 && number - visible[index - 1] > 1 && (
                <span aria-hidden="true" className="px-1 text-slate-400">
                  …
                </span>
              )}
              <button
                type="button"
                aria-label={`صفحه ${number.toLocaleString("fa-IR")}`}
                aria-current={number === page ? "page" : undefined}
                disabled={loading}
                onClick={() => onPage(number)}
                className={`${buttonClass} ${number === page ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-200" : ""}`}
              >
                {number.toLocaleString("fa-IR")}
              </button>
            </span>
          ))}
        </div>
        <button
          type="button"
          disabled={page >= pages || loading}
          onClick={() => onPage(page + 1)}
          className={`${buttonClass} order-3`}
        >
          صفحه بعد
        </button>
      </div>
    </nav>
  );
}
