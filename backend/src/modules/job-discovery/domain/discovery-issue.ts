export interface DiscoveryIssue {
  category: "site" | "provider" | "extraction" | "timeout" | "unknown";
  message: string;
  retryable: boolean;
  stage?: "search" | "fetch" | "extract" | "filter" | "validate";
}

// Public task summaries, never provider bodies or internal model reasoning.
function issueDetails(code: string): DiscoveryIssue {
  if (code.startsWith("PAGE_"))
    return {
      category: "site",
      retryable: code !== "PAGE_ACCESS_BLOCKED",
      message:
        code === "PAGE_ACCESS_BLOCKED"
          ? "سایت کاریابی دسترسی خودکار به این صفحه را نپذیرفت."
          : "صفحهٔ سایت کاریابی پیام خطای اتصال یا بارگذاری نشان داد؛ آگهی قابل بررسی نبود.",
    };
  if (
    [
      "TIMEOUT",
      "FETCH_TIMEOUT",
      "SEARCH_TIMEOUT",
      "EXTRACTION_TIMEOUT",
    ].includes(code)
  )
    return {
      category: "timeout",
      retryable: true,
      message:
        code === "EXTRACTION_TIMEOUT"
          ? "سرویس تحلیل در مهلت مقرر نتوانست اطلاعات آگهی را استخراج کند."
          : "مهلت دریافت یا بررسی این منبع تمام شد؛ علت کندی سایت یا سرویس دریافت هنوز مشخص نیست.",
    };
  if (code.startsWith("EXTRACTION_") && !code.startsWith("EXTRACTION_HTTP_"))
    return {
      category: "extraction",
      retryable: false,
      message:
        "اطلاعات یک آگهی معتبر از صفحه قابل استخراج نبود؛ قالب صفحه ممکن است تغییر کرده باشد.",
    };
  if (code === "FETCH_EMPTY_CONTENT")
    return {
      category: "unknown",
      retryable: true,
      message:
        "سرویس دریافت، محتوای قابل استفاده‌ای از سایت برنگرداند؛ علت سمت سایت یا سرویس هنوز مشخص نیست.",
    };
  if (
    /^(?:FETCH|SEARCH|EXTRACTION)_HTTP_/.test(code) ||
    /^(?:JOB_SEARCH_PROVIDER_UNAVAILABLE|JOB_FETCH_PROVIDER_UNAVAILABLE|JOB_FETCH_SECURITY_UNVERIFIED|FETCH_NETWORK_ERROR|FETCH_PROVIDER_MISMATCH|FETCH_PROVENANCE_MISSING|PROVIDER_RESPONSE_INVALID|PROVIDER_FAILURE|PROVIDER_REPORT_MISSING)$/.test(
      code,
    )
  )
    return {
      category: "provider",
      retryable: !/(?:401|403|SECURITY|PROVENANCE|MISMATCH)/.test(code),
      message: /(?:401|403)/.test(code)
        ? "سرویس جستجو یا تحلیل درخواست را نپذیرفت؛ تنظیمات دسترسی سرویس نیاز به بررسی دارد."
        : "سرویس جستجو یا دریافت صفحه پاسخ معتبر نداد؛ این خطا به معنی نبودن فرصت شغلی نیست.",
    };
  return {
    category: "unknown",
    retryable: true,
    message: "بررسی این منبع کامل نشد؛ علت سمت سایت یا سرویس هنوز مشخص نیست.",
  };
}

export function discoveryIssue(code: string): DiscoveryIssue {
  const stage = /^SEARCH_|JOB_SEARCH_/.test(code) ? "search"
    : /^EXTRACTION_/.test(code) ? "extract"
    : /^FETCH_|^PAGE_|JOB_FETCH_/.test(code) ? "fetch"
    : code === "SOURCE_REJECTED" ? "validate" : undefined;
  return { ...issueDetails(code), ...(stage ? { stage } : {}) };
}

export const publicSource = (report: {
  source: string;
  found: number;
  accepted: number;
  rejected: number;
  error?: string;
}) => ({
  source: report.source,
  found: report.found,
  accepted: report.accepted,
  rejected: report.rejected,
  ...(report.error
    ? { failed: true, issue: discoveryIssue(report.error) }
    : {}),
});
