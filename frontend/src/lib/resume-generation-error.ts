export function resumeGenerationError(failure: unknown): string {
  const error = failure as {
    code?: string;
    response?: {
      status?: number;
      data?: { message?: unknown; error?: unknown };
    };
  };
  if (!error?.response)
    return "ارتباط با سرویس رزومه برقرار نشد. اطلاعات شما حفظ شده؛ دوباره تلاش کنید.";
  const { status, data } = error.response;
  if (status === 400 || status === 404 || status === 409) {
    const nested = data?.error;
    const message =
      data?.message ??
      (nested && typeof nested === "object" && "message" in nested
        ? nested.message
        : undefined);
    if (typeof message === "string" && message.trim()) return message;
    if (status === 409)
      return "رزومه پایه تغییر کرده است. صفحه را تازه‌سازی کنید و دوباره تغییرات را ذخیره کنید.";
    return status === 404
      ? "آگهی انتخاب‌شده یافت نشد. یک فرصت دیگر انتخاب کنید."
      : "اطلاعات لازم برای ساخت رزومه کامل نیست. پروفایل خود را تکمیل کنید.";
  }
  if (status === 401) return "برای ساخت رزومه وارد حساب خود شوید.";
  return "سرویس تولید رزومه در این نوبت پاسخ قابل استفاده نداد. اطلاعات شما حفظ شده؛ دوباره تلاش کنید.";
}
