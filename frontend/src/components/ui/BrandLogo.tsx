const variants = {
  icon: "h-10 w-10",
  wordmark: "w-44",
  full: "w-full max-w-xl",
  vertical: "w-52",
} as const;

export function BrandLogo({
  variant = "icon",
  className,
  tone = "auto",
}: {
  variant?: keyof typeof variants;
  className?: string;
  priority?: boolean;
  tone?: "auto" | "inverse";
}) {
  const standalone = variant === "icon";
  const vertical = variant === "vertical";
  const expanded = variant === "full" || vertical;
  return (
    <span
      role="img"
      aria-label={
        expanded
          ? "KarMatch — مهارت‌های تو، فرصت مناسب تو."
          : "KarMatch — کارمچ"
      }
      data-brand={variant}
      className={`${standalone ? "inline-flex" : "flex"} shrink-0 items-center ${vertical ? "flex-col gap-3 text-center" : "gap-3"} ${expanded ? "justify-center" : ""} ${className ?? variants[variant]}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/karmatch-mark.svg"
        alt=""
        aria-hidden="true"
        width={48}
        height={48}
        className={
          standalone
            ? "h-full w-full"
            : expanded
              ? "h-14 w-14 shrink-0"
              : "h-10 w-10 shrink-0"
        }
      />
      {!standalone && (
        <span
          className={`flex min-w-0 flex-col ${vertical ? "items-center" : "items-start"}`}
        >
          <span
            className={`${expanded ? "text-3xl" : "text-2xl"} font-black leading-tight tracking-tight ${tone === "inverse" ? "text-white" : "text-slate-900 dark:text-slate-100"}`}
          >
            کارمچ
          </span>
          {expanded ? (
            <span className="mt-2 text-xs font-medium leading-6 text-slate-500 dark:text-slate-400">
              مهارت‌های تو، فرصت مناسب تو.
            </span>
          ) : (
            <span
              dir="ltr"
              className="mt-0.5 text-[10px] font-semibold tracking-[0.12em] text-slate-500 dark:text-slate-400"
            >
              KarMatch
            </span>
          )}
        </span>
      )}
    </span>
  );
}
