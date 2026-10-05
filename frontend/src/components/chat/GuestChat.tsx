"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Icon } from "@/components/pathly/Icon";
import {
  guestChatClient,
  guestContinuationKey,
  guestDraftKey,
  type GuestChatState,
} from "@/lib/guest-chat-client";

const prompts = [
  "کار بک‌اند Node دورکار می‌خوام",
  "برای شروع دنبال کار فرانت‌اند هستم",
  "Python بلدم و ۲ سال سابقه دارم",
];
export function GuestChat() {
  const [chat, setChat] = useState<GuestChatState | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  async function restore() {
    setLoading(true);
    setError("");
    try {
      const response = await guestChatClient.get<{ data: GuestChatState }>(
        "/api/chat/guest",
      );
      setChat(response.data.data);
      if (response.data.data.messages.length)
        sessionStorage.setItem(guestContinuationKey, "1");
    } catch (failure: unknown) {
      const status = (failure as { response?: { status?: number } }).response
        ?.status;
      if (status === 403)
        setChat({
          messages: [],
          context: {
            searchContext: { targetRoles: [] },
            candidateFacts: { skills: [], deniedSkills: [], statements: [] },
          },
          remaining: 0,
          limit: 5,
          authRequired: true,
        });
      else setError("اتصال به گفتگو برقرار نشد. دوباره تلاش کن.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setDraft(sessionStorage.getItem(guestDraftKey) ?? "");
    void restore();
  }, []);
  useEffect(() => {
    if (chat?.messages.length)
      end.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [chat?.messages.length]);
  function saveDraft(value: string) {
    setDraft(value);
    sessionStorage.setItem(guestDraftKey, value);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || pending || loading || !chat || chat.authRequired)
      return;
    setPending(true);
    setError("");
    try {
      const response = await guestChatClient.post<{ data: GuestChatState }>(
        "/api/chat/guest/message",
        { message: draft.trim() },
      );
      setChat(response.data.data);
      saveDraft("");
      sessionStorage.setItem(guestContinuationKey, "1");
    } catch (failure: unknown) {
      const code = (
        failure as { response?: { data?: { error?: { code?: string } } } }
      ).response?.data?.error?.code;
      if (
        code === "GUEST_LIMIT_REACHED" ||
        code === "GUEST_SESSION_UNAVAILABLE"
      )
        setChat((value) =>
          value ? { ...value, remaining: 0, authRequired: true } : value,
        );
      else
        setError(
          code === "RATE_LIMITED"
            ? "کمی مکث کن؛ یک دقیقه دیگر دوباره پیام بده."
            : "پیام ارسال نشد؛ متنت حفظ شده. دوباره تلاش کن.",
        );
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      aria-labelledby="guest-chat-title"
      className="glass-card flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-light-surface shadow-2xl shadow-brand-500/5 dark:border-dark-border dark:bg-dark-surface"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-dark-border">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10" />
          <div>
            <h2 id="guest-chat-title" className="text-sm font-extrabold">
              با جاب مچ گفتگو کن
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              شروع بدون ثبت‌نام
            </p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          دستیار شغلی
        </span>
      </header>
      <div
        role="log"
        aria-label="پیام‌های گفتگو"
        aria-live="polite"
        className="max-h-[400px] min-h-[240px] flex-1 space-y-4 overflow-y-auto p-5 text-sm leading-7"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
            <Icon name="robot" />
          </div>
          <div className="rounded-2xl rounded-tr-none bg-slate-100 p-4 dark:bg-dark-card">
            <p className="font-bold">
              سلام! دنبال چه تغییری در مسیر شغلی‌ات هستی؟
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              از نقش دلخواه، مهارت‌ها یا شرایط کارت بگو؛ با هم درخواست شغلی‌ات
              را روشن می‌کنیم.
            </p>
          </div>
        </div>
        {chat?.messages.map((message) => (
          <article
            key={message.id}
            aria-label={message.role === "user" ? "پیام شما" : "پاسخ دستیار"}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <p
              dir="auto"
              className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-xs leading-6 ${message.role === "user" ? "rounded-tl-none bg-brand-500 text-white" : "rounded-tr-none bg-slate-100 dark:bg-dark-card"}`}
            >
              {message.content}
            </p>
          </article>
        ))}
        {loading && (
          <p role="status" className="text-xs text-slate-400">
            در حال اتصال به گفتگو…
          </p>
        )}
        {pending && (
          <p role="status" className="text-xs text-brand-500">
            در حال آماده‌کردن پاسخ…
          </p>
        )}
        <div ref={end} />
      </div>
      {error && (
        <div
          role="alert"
          className="mx-5 mb-3 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-500"
        >
          {error}
          {!chat && (
            <button onClick={() => void restore()} className="mr-2 underline">
              تلاش دوباره
            </button>
          )}
        </div>
      )}
      {!chat?.messages.length && (
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                saveDraft(prompt);
                document.getElementById("guest-chat-input")?.focus();
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] text-slate-500 transition-colors hover:border-brand-500 hover:text-brand-500 dark:border-dark-border dark:text-slate-400"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
      {chat?.authRequired && (
        <div
          role="status"
          className="mx-5 mb-4 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4"
        >
          <h3 className="text-sm font-bold">گفتگو را از همین‌جا ادامه بده</h3>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
            پیام‌های مهمان تمام شده‌اند. ثبت‌نام کن یا وارد حساب شو؛ گفتگو و متن
            نوشته‌شده‌ات حفظ می‌شوند.
          </p>
          <div className="mt-3 flex gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white"
            >
              ثبت‌نام و ادامه گفتگو
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-brand-500/30 px-4 py-2 text-xs font-bold text-brand-500"
            >
              ورود به حساب
            </Link>
          </div>
        </div>
      )}
      <form
        onSubmit={submit}
        className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-dark-border dark:bg-dark-card/30"
      >
        <div className="flex gap-2">
          <label htmlFor="guest-chat-input" className="sr-only">
            پیام شما
          </label>
          <textarea
            id="guest-chat-input"
            dir="auto"
            rows={2}
            value={draft}
            onChange={(event) => saveDraft(event.target.value)}
            maxLength={4000}
            disabled={pending}
            placeholder="مثلاً: کار بک‌اند دورکار با حداقل حقوق ۲۰ میلیون می‌خوام…"
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-6 focus:border-brand-500 focus:outline-none dark:border-dark-border dark:bg-dark-surface"
          />
          <button
            type="submit"
            aria-label="ارسال پیام"
            disabled={
              pending || loading || !chat || !draft.trim() || chat.authRequired
            }
            className="self-end rounded-xl bg-brand-500 px-4 py-4 text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="paper-plane" />
          </button>
        </div>
        <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-400">
          {chat
            ? `${chat.remaining.toLocaleString("fa-IR")} پیام از ${chat.limit.toLocaleString("fa-IR")} پیام مهمان باقی مانده`
            : "۵ پیام برای شروع بدون حساب"}{" "}
          · برای ادامه و نگهداری گفتگو، حساب بساز.
        </p>
      </form>
    </section>
  );
}
