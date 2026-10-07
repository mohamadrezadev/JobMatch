import type { RunEvent } from "@/types/chat-run";
import type { GuestProgressEvent } from "./guest-chat-stream";
export const discoveryCountHint =
  "هدف پیش‌فرض، ۵ آگهی با شرایط تأییدشده است؛ می‌توانی بنویسی «۱۰ آگهی پیدا کن». ممکن است نتیجه کمتری پیدا شود.";
export function discoveryTargetLabel(count: unknown): string {
  return typeof count === "number" &&
    Number.isInteger(count) &&
    count > 0 &&
    count <= 50
    ? `هدف جستجو: ${count.toLocaleString("fa-IR")} آگهی با شرایط تأییدشده`
    : "";
}
export const sourceNames: Record<string, string> = {
  "jobinja.ir": "جابینجا",
  "jobvision.ir": "جاب‌ویژن",
  "irantalent.com": "ایران‌تلنت",
  "e-estekhdam.com": "ای‌استخدام",
};
export const stageLabels: Record<string, string> = {
  fetch: "در حال دریافت صفحه‌های آگهی",
  extract: "در حال استخراج اطلاعات آگهی‌ها",
  filter: "در حال تطبیق آگهی‌ها با شرایط شما",
};
export function progressLabel(
  event?: Pick<RunEvent, "type" | "data"> | GuestProgressEvent,
) {
  if (!event) return "درخواست پذیرفته شد؛ آمادهٔ بررسی";
  const { type, data } = event;
  const source = sourceNames[String(data.source)] ?? String(data.source ?? "");
  if (type === "agent.started" && discoveryTargetLabel(data.targetValidJobs))
    return discoveryTargetLabel(data.targetValidJobs);
  if (type === "context.processing")
    return "در حال بررسی عنوان شغلی، شهر و شرایط شما";
  if (type === "context.updated") return "شرایط شما مشخص شد؛ آماده‌سازی جستجو";
  if (type === "agent.planning") return "در حال برنامه‌ریزی مرحلهٔ بعدی جستجو";
  if (type === "source.progress")
    return `${source}: ${stageLabels[String(data.stage)] ?? "در حال بررسی آگهی‌ها"}`;
  if (type === "source.started") return `${source}: در حال جستجوی لینک آگهی‌ها`;
  if (type === "source.failed")
    return `${source}: بررسی کامل نشد؛ جستجو در منابع دیگر ادامه دارد`;
  if (type === "source.completed") return `${source}: بررسی این منبع تمام شد`;
  if (type === "job.accepted" || type === "agent.observation")
    return "در حال تطبیق نتایج با شرایط و حداقل حقوق شما";
  if (["results.saving", "search.completed", "agent.completed"].includes(type))
    return "در حال آماده‌سازی و ذخیرهٔ نتایج";
  if (type === "search.cached") return "نتایج ذخیره‌شدهٔ همین شرایط بازیابی شد";
  return "در حال جستجو و بررسی منابع شغلی";
}
