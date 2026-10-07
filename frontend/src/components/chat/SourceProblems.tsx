import type { DiscoveryIssue } from "@/types/discovery";
import { sourceNames } from "@/lib/discovery-progress";
const labels = {
  site: "خطای صفحهٔ سایت",
  provider: "خطای سرویس",
  extraction: "مشکل خواندن آگهی",
  timeout: "اتمام مهلت",
  unknown: "علت نامشخص",
};
export function SourceProblems({
  sources,
}: {
  sources: Array<{
    source: string;
    error?: string;
    failed?: boolean;
    issue?: DiscoveryIssue;
  }>;
}) {
  const problems = sources.filter(
    (source) => source.issue || source.error || source.failed,
  );
  if (!problems.length) return null;
  return (
    <aside
      aria-label="مشکلات بررسی منابع"
      className="space-y-2 rounded-lg bg-amber-500/10 p-3 text-xs leading-6 text-amber-700 dark:text-amber-300"
    >
      <p className="font-bold">بررسی بعضی منابع کامل نشد</p>
      {problems.map((source) => (
        <p key={source.source}>
          <strong>{sourceNames[source.source] ?? source.source}</strong> ·{" "}
          {labels[source.issue?.category ?? "unknown"]}:{" "}
          {source.issue?.message ??
            "دریافت یا بررسی آگهی‌ها کامل نشد؛ علت سمت سایت یا سرویس هنوز مشخص نیست."}
        </p>
      ))}
      <p>نتایج دریافت‌شده از منابع دیگر حفظ شده‌اند.</p>
    </aside>
  );
}
