"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { GuestChat } from "@/components/chat/GuestChat";
import apiClient from "@/lib/api-client";
import { guestContinuationKey, guestDraftKey } from "@/lib/guest-chat-client";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { Icon } from "@/components/pathly/Icon";

const workLabels = { Remote: "دورکار", Hybrid: "هیبرید", OnSite: "حضوری" };
export default function ChatExperience() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <AuthenticatedChat /> : <GuestChat />;
}
function AuthenticatedChat() {
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimRetry, setClaimRetry] = useState(0);
  const { user, isAuthenticated } = useAuthStore();
  const chat = useChatStore();
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const owner = isAuthenticated ? (user?.id ?? null) : null;
    useChatStore.getState().reset(owner);
    setDraft(
      new URLSearchParams(window.location.search).get("prompt") ??
        sessionStorage.getItem(guestDraftKey) ??
        "",
    );
    if (!owner) return;
    let cancelled = false;
    setClaimError("");
    async function initialize() {
      const importedKey = `jobmatch-imported-${owner}`;
      setClaiming(true);
      try {
        let id = sessionStorage.getItem(importedKey);
        if (!id && sessionStorage.getItem(guestContinuationKey)) {
          const response = await apiClient.post(
            "/api/chat/guest/claim",
            {},
            { withCredentials: true },
          );
          id = response.data.data.conversationId;
          if (id) sessionStorage.setItem(importedKey, id);
        }
        if (cancelled) return;
        if (id) {
          await useChatStore.getState().select(id);
          if (cancelled) return;
          if (useChatStore.getState().error)
            throw new Error("History unavailable");
          sessionStorage.removeItem(importedKey);
        }
        sessionStorage.removeItem(guestContinuationKey);
        await useChatStore.getState().loadList();
      } catch {
        if (!cancelled)
          setClaimError(
            "ادامه گفتگو بارگذاری نشد. پیام‌ها و متنت حفظ شده‌اند؛ دوباره تلاش کن.",
          );
      } finally {
        if (!cancelled) setClaiming(false);
      }
    }
    void initialize();
    return () => {
      cancelled = true;
      useChatStore.getState().reset(null);
    };
  }, [hydrated, isAuthenticated, user?.id, claimRetry]);
  useEffect(() => {
    if (chat.active?.messages.length)
      end.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [chat.active?.messages.length]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (claiming || claimError) return;
    if (await chat.send(draft.trim())) {
      setDraft("");
      sessionStorage.removeItem(guestDraftKey);
    }
  }
  if (!hydrated || !isAuthenticated || !user)
    return (
      <p role="status" className="text-xs text-slate-400">
        در حال بررسی ورود…
      </p>
    );
  const context = chat.active?.context.searchContext;
  const ready = Boolean(context?.targetRoles.length);
  return (
    <section className="glass-card flex h-[calc(100dvh-120px)] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-light-surface dark:border-dark-border dark:bg-dark-surface">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/50 p-4 dark:border-dark-border dark:bg-dark-card/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 text-white shadow-md">
            <Icon name="wand-magic-sparkles" className="text-sm" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-white">
              دستیار هوشمند شغلی جاب مچ
            </h1>
            <p className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500" />
              فعال و آماده تحلیل
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            aria-label="تاریخچه گفتگو"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((value) => !value)}
            className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-400 dark:bg-dark-card"
          >
            <Icon name="clock-rotate-left" />
          </button>
          <button
            aria-label="گفتگوی جدید"
            disabled={chat.pending || claiming || Boolean(claimError)}
            onClick={() => {
              chat.startNew();
              setDraft("");
            }}
            className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-400 transition-all hover:text-rose-500 dark:bg-dark-card"
          >
            <Icon name="trash" className="ml-1" />
            <span className="hidden sm:inline">پاک‌سازی گفت‌وگو</span>
          </button>
        </div>
      </div>
      {historyOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 text-xs dark:border-dark-border">
          <label htmlFor="conversation">گفتگوهای قبلی</label>
          <select
            id="conversation"
            value={chat.active?.id ?? ""}
            disabled={chat.pending || claiming || Boolean(claimError)}
            onChange={(event) => {
              if (event.target.value) {
                setDraft("");
                void chat.select(event.target.value);
              }
            }}
            className="max-w-full rounded-lg border border-slate-200 bg-light-surface p-2 dark:border-dark-border dark:bg-dark-card"
          >
            <option value="">انتخاب گفتگو</option>
            {chat.conversations.map((conversation, i) => (
              <option key={conversation.id} value={conversation.id}>
                گفتگو {i + 1} —{" "}
                {new Date(conversation.updatedAt).toLocaleString("fa-IR")}
              </option>
            ))}
          </select>
          <button
            disabled={chat.pending || claiming || Boolean(claimError)}
            onClick={() => void chat.loadList()}
            className="text-brand-500"
          >
            تازه‌سازی فهرست
          </button>
        </div>
      )}
      {claimError && (
        <div role="alert" className="bg-rose-500/10 p-3 text-xs text-rose-500">
          {claimError}
          <button
            onClick={() => setClaimRetry((value) => value + 1)}
            className="mr-2 underline"
          >
            تلاش دوباره
          </button>
        </div>
      )}
      {claiming && (
        <p role="status" className="p-3 text-xs text-brand-500">
          در حال آماده‌کردن گفتگو…
        </p>
      )}
      {chat.error && (
        <p role="alert" className="bg-rose-500/10 p-3 text-xs text-rose-500">
          {chat.error}
        </p>
      )}
      <div
        role="log"
        aria-label="پیام‌های گفتگو"
        aria-live="polite"
        aria-relevant="additions"
        className="flex-1 space-y-4 overflow-y-auto p-4 text-xs leading-relaxed"
      >
        {!chat.active?.messages.length && (
          <div className="flex animate-slide-in items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-500">
              <Icon name="robot" />
            </div>
            <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tr-none border border-slate-200/50 bg-slate-100 p-4 text-slate-800 dark:border-dark-border dark:bg-dark-card dark:text-slate-200">
              <p className="font-bold text-brand-500">
                سلام {user.firstName}! من دستیار شغلی هوشمند جاب مچ هستم.
              </p>
              <p>چگونه می‌توانم امروز به شما کمک کنم؟ می‌توانید بگویید:</p>
              <ul className="list-inside list-disc space-y-1 text-slate-500 dark:text-slate-400">
                <li>«یه کار بک‌اند Node دورکار بالای ۱۵ تومن می‌خوام»</li>
                <li>«فقط دورکار، حداقل ۲۰ میلیون»</li>
                <li>«Python بلد نیستم»</li>
              </ul>
            </div>
          </div>
        )}
        {chat.active?.messages.map((message) => (
          <article
            key={message.id}
            aria-label={message.role === "user" ? "پیام شما" : "پاسخ دستیار"}
            className={`flex animate-slide-in items-start gap-3 ${message.role === "user" ? "justify-end" : ""}`}
          >
            {message.role !== "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-xs text-brand-500">
                <Icon name="robot" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl p-3 ${message.role === "user" ? "rounded-tl-none bg-brand-500 text-white" : "rounded-tr-none border border-slate-200/50 bg-slate-100 text-slate-800 dark:border-dark-border dark:bg-dark-card dark:text-slate-200"}`}
            >
              <p dir="auto" className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
          </article>
        ))}
        {chat.pending && (
          <p role="status" className="text-brand-500">
            در حال پردازش…
          </p>
        )}
        <div ref={end} />
      </div>
      {context && (
        <details className="border-t border-slate-200 px-4 py-2 text-[10px] dark:border-dark-border">
          <summary className="cursor-pointer text-emerald-500">
            {ready ? "آماده ارسال به جستجوی فرصت‌ها" : "منتظر تعیین نقش شغلی"}
          </summary>
          <div className="mt-2 flex flex-wrap gap-2 text-slate-500 dark:text-slate-400">
            {context.targetRoles.map((role) => (
              <span
                key={role}
                dir="auto"
                className="rounded bg-brand-500/10 px-2 py-1 text-brand-500"
              >
                {role}
              </span>
            ))}
            {context.workTypes?.map((work) => (
              <span key={work}>{workLabels[work]}</span>
            ))}
            {context.minimumSalary !== undefined && (
              <span>{context.minimumSalary.toLocaleString("fa-IR")} تومان</span>
            )}
            <span>درخواست ذخیره شده است؛ جستجوی واقعی هنوز اجرا نمی‌شود.</span>
          </div>
        </details>
      )}
      <div className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-dark-border dark:bg-dark-card/50">
        <form onSubmit={submit} className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">
            پیام شما
          </label>
          <input
            id="chat-input"
            dir="auto"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={4000}
            disabled={chat.pending || claiming || Boolean(claimError)}
            placeholder="پیام خود را بنویسید (مثلاً: فقط موقعیت‌های دورکاری با حقوق بالای ۲۲ میلیون)..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-800 focus:border-brand-500 focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-white"
          />
          <button
            type="submit"
            aria-label="ارسال پیام"
            disabled={
              chat.pending || claiming || Boolean(claimError) || !draft.trim()
            }
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600"
          >
            <span>ارسال</span>
            <Icon name="paper-plane" className="text-xs" />
          </button>
        </form>
      </div>
    </section>
  );
}
