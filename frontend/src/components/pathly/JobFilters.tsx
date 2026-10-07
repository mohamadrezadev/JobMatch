"use client";

import { useEffect, useId, useState } from "react";

export interface OpportunityFilters {
  query: string;
  city: string;
  workType: string;
  level: string;
  role: string;
  skills: string;
  minimumSalary: string;
}

export const emptyOpportunityFilters: OpportunityFilters = {
  query: "",
  city: "",
  workType: "",
  level: "",
  role: "",
  skills: "",
  minimumSalary: "",
};

const workLabels: Record<string, string> = {
  Remote: "دورکاری",
  Hybrid: "ترکیبی (حضوری و دورکاری)",
  OnSite: "حضوری",
};
const levelLabels: Record<string, string> = {
  Junior: "جونیور / تازه‌کار",
  Mid: "میدل / باتجربه",
  Senior: "سنیور / ارشد",
};
const controlClass =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-slate-600 dark:bg-dark-card dark:text-slate-100";

export function JobFilters({
  value,
  onApply,
}: {
  value: OpportunityFilters;
  onApply: (filters: OpportunityFilters) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  useEffect(() => setDraft(value), [value]);
  const changed = Object.keys(value).some(
    (key) =>
      draft[key as keyof OpportunityFilters] !==
      value[key as keyof OpportunityFilters],
  );
  const active = Object.entries(value).filter(([, entry]) => entry !== "") as [
    keyof OpportunityFilters,
    string,
  ][];
  const extraCount = [
    value.level,
    value.role,
    value.skills,
    value.minimumSalary,
  ].filter(Boolean).length;
  const update = (key: keyof OpportunityFilters, next: string) =>
    setDraft((current) => ({ ...current, [key]: next }));
  const label = (key: keyof OpportunityFilters, entry: string) => {
    switch (key) {
      case "query":
        return `جستجو: ${entry}`;
      case "city":
        return `شهر: ${entry}`;
      case "workType":
        return workLabels[entry];
      case "level":
        return levelLabels[entry];
      case "role":
        return `نقش: ${entry}`;
      case "skills":
        return `مهارت: ${entry}`;
      case "minimumSalary":
        return `حداقل حقوق: ${Number(entry).toLocaleString("fa-IR")} تومان`;
    }
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const next = { ...draft };
        for (const key of Object.keys(next) as (keyof OpportunityFilters)[]) {
          next[key] = next[key].trim();
        }
        onApply(next);
      }}
      className="glass-card space-y-4 rounded-2xl border border-slate-200 bg-light-surface p-4 dark:border-dark-border dark:bg-dark-surface sm:p-5"
      aria-label="فیلتر فرصت‌ها"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
        <label className="space-y-2 text-xs font-semibold">
          جستجوی فرصت‌ها
          <input
            type="search"
            value={draft.query}
            onChange={(event) => update("query", event.target.value)}
            placeholder="عنوان شغلی، مهارت یا نام شرکت"
            className={controlClass}
          />
        </label>
        <label className="space-y-2 text-xs font-semibold">
          شهر
          <input
            value={draft.city}
            onChange={(event) => update("city", event.target.value)}
            placeholder="همه شهرها؛ مثلاً تهران"
            className={controlClass}
          />
        </label>
        <label className="space-y-2 text-xs font-semibold">
          نوع حضور
          <select
            value={draft.workType}
            onChange={(event) => update("workType", event.target.value)}
            className={controlClass}
          >
            <option value="">همه انواع حضور</option>
            {Object.entries(workLabels).map(([key, text]) => (
              <option key={key} value={key}>
                {text}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${id}-extra`}
        onClick={() => setExpanded((current) => !current)}
        className="min-h-11 rounded-lg px-3 text-xs font-bold text-brand-600 hover:bg-brand-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-200"
      >
        {expanded ? "بستن فیلترهای بیشتر" : "فیلترهای بیشتر"}
        {extraCount > 0
          ? ` (${extraCount.toLocaleString("fa-IR")} فعال)`
          : ""}{" "}
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      <div id={`${id}-extra`} hidden={!expanded}>
        <div className="grid gap-3 border-t border-slate-200 pt-4 dark:border-dark-border sm:grid-cols-2">
          <label className="space-y-2 text-xs font-semibold">
            سطح تجربه
            <select
              value={draft.level}
              onChange={(event) => update("level", event.target.value)}
              className={controlClass}
            >
              <option value="">همه سطوح تجربه</option>
              {Object.entries(levelLabels).map(([key, text]) => (
                <option key={key} value={key}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-xs font-semibold">
            نقش شغلی
            <input
              value={draft.role}
              onChange={(event) => update("role", event.target.value)}
              placeholder="مثلاً حسابدار یا Frontend"
              className={controlClass}
            />
          </label>
          <label className="space-y-2 text-xs font-semibold">
            مهارت‌ها
            <input
              value={draft.skills}
              onChange={(event) => update("skills", event.target.value)}
              placeholder="مثلاً React, TypeScript"
              aria-describedby={`${id}-skills`}
              className={controlClass}
            />
            <span
              id={`${id}-skills`}
              className="block font-normal text-slate-500 dark:text-slate-400"
            >
              چند مهارت را با ویرگول جدا کن.
            </span>
          </label>
          <label className="space-y-2 text-xs font-semibold">
            حداقل حقوق ماهانه (تومان)
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={draft.minimumSalary}
              onChange={(event) => update("minimumSalary", event.target.value)}
              placeholder="مثلاً ۲۰۰۰۰۰۰۰"
              aria-describedby={`${id}-salary`}
              className={controlClass}
            />
            <span
              id={`${id}-salary`}
              className="block font-normal text-slate-500 dark:text-slate-400"
            >
              مبلغ را به تومان وارد کن؛ خالی یعنی بدون محدودیت.
            </span>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          اعمال فیلترها
        </button>
        <p role="status" className="text-xs text-slate-500 dark:text-slate-400">
          {changed
            ? "برای دیدن نتیجه، فیلترها را اعمال کن."
            : "فیلترها با دکمه اعمال یا کلید Enter اجرا می‌شوند."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-dark-border">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          فیلترهای فعال:
        </span>
        {active.length ? (
          active.map(([key, entry]) => (
            <button
              type="button"
              key={key}
              aria-label={`حذف ${label(key, entry)}`}
              onClick={() => onApply({ ...value, [key]: "" })}
              className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl bg-brand-500/10 px-3 text-xs text-brand-700 hover:bg-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-200"
            >
              <span className="break-all">{label(key, entry)}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            بدون محدودیت
          </span>
        )}
        {(active.length > 0 || changed) && (
          <button
            type="button"
            onClick={() => {
              setDraft(emptyOpportunityFilters);
              onApply(emptyOpportunityFilters);
            }}
            className="min-h-11 rounded-lg px-3 text-xs font-semibold text-slate-600 underline underline-offset-4 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-slate-300"
          >
            پاک کردن همه
          </button>
        )}
      </div>
    </form>
  );
}
