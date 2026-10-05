import { ChatIntent, ConversationContext } from "./conversation";

export function chatReply(result: {
  intent: ChatIntent;
  understood: boolean;
  context: ConversationContext;
}): string {
  const deferred: Partial<Record<ChatIntent, string>> = {
    RESUME_BUILD:
      "در این مرحله رزومه تولید نمی‌شود. می‌توانید از بخش رزومه اقدام کنید.",
    JOB_DETAILS: "برای دیدن جزئیات آگهی به بخش فرصت‌های شغلی بروید.",
    JOB_FEEDBACK: "بازخورد آگهی را از صفحه همان فرصت شغلی ثبت کنید.",
    PROFILE_UPDATE:
      "گفته‌های شما جدا از ترجیحات جستجو در این گفتگو ثبت شد؛ اطلاعاتی به سوابق شما اضافه نکردم.",
  };
  return (
    deferred[result.intent] ??
    (!result.understood
      ? "برای آماده‌کردن درخواست جستجو، عنوان شغلی یا ترجیح خود را روشن‌تر بنویسید؛ مثلاً «کار بک‌اند دورکار می‌خوام»."
      : result.context.searchContext.targetRoles.length
        ? "درخواست شما برای جستجو آماده است. می‌توانید ترجیحات را در ادامه تغییر دهید."
        : "دنبال چه نقش شغلی هستید؟ مثلاً بک‌اند، فرانت‌اند یا React.")
  );
}
