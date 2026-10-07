"use client";

import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

export function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={twMerge(
        "inline-block h-5 w-5 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin",
        className,
      )}
    />
  );
}

export function LoadingState({
  title,
  description,
  compact = false,
  className = "",
}: {
  title: string;
  description?: string;
  compact?: boolean;
  className?: string;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(timer);
  }, [title]);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`flex items-center gap-4 rounded-2xl border border-brand-500/15 bg-gradient-to-l from-brand-500/10 to-transparent ${compact ? "p-3" : "p-5 sm:p-6"} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-200 ${compact ? "h-10 w-10" : "h-14 w-14"}`}
      >
        <span className="absolute inset-1 rounded-xl border border-brand-500/15 motion-safe:animate-pulse" />
        <LoadingSpinner className={compact ? "h-5 w-5" : "h-7 w-7"} />
      </span>
      <div className="min-w-0 space-y-1.5">
        <p
          className={`${compact ? "text-xs" : "text-sm"} font-bold text-slate-800 dark:text-slate-100`}
        >
          {title}
        </p>
        {(slow || description) && (
          <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">
            {slow ? "پاسخ هنوز نرسیده؛ کمی بیشتر منتظر بمان." : description}
          </p>
        )}
      </div>
    </div>
  );
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={twMerge(
        "h-3 rounded-full bg-slate-200/80 motion-safe:animate-pulse dark:bg-slate-700/60",
        className,
      )}
    />
  );
}

export function ContentSkeleton({
  layout = "cards",
}: {
  layout?: "cards" | "form" | "chat" | "detail" | "list";
}) {
  return (
    <div
      aria-hidden="true"
      className={
        layout === "cards"
          ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          : "space-y-4"
      }
    >
      {Array.from({ length: layout === "detail" ? 1 : 3 }, (_, index) => (
        <div
          key={index}
          className={`${layout === "chat" ? (index % 2 ? "ml-auto w-4/5" : "mr-auto w-3/4") : ""} space-y-4 rounded-2xl border border-slate-200 bg-light-surface p-5 dark:border-dark-border dark:bg-dark-surface`}
        >
          <SkeletonLine className="h-4 w-2/3" />
          <SkeletonLine className="w-full" />
          <SkeletonLine className="w-4/5" />
          {layout === "form" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <SkeletonLine className="h-11 rounded-xl" />
              <SkeletonLine className="h-11 rounded-xl" />
            </div>
          )}
          {layout === "detail" && (
            <>
              <SkeletonLine className="w-full" />
              <SkeletonLine className="w-1/2" />
              <SkeletonLine className="mt-6 h-24 rounded-xl" />
            </>
          )}
          <SkeletonLine className="w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function PageLoading({
  title = "در حال آماده‌کردن صفحه…",
  description = "محتوای این صفحه در حال دریافت است.",
  layout = "cards",
}: {
  title?: string;
  description?: string;
  layout?: "cards" | "form" | "chat" | "detail";
}) {
  return (
    <div aria-busy="true" className="space-y-5">
      <LoadingState title={title} description={description} />
      <ContentSkeleton layout={layout} />
    </div>
  );
}
