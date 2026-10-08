"use client";
import {
  LoadingState,
  LoadingSpinner,
  PageLoading,
} from "@/components/ui/LoadingState";
import { FormEvent, Fragment, useEffect, useRef, useState } from "react";
import { GuestChat } from "@/components/chat/GuestChat";
import apiClient from "@/lib/api-client";
import { guestContinuationKey, guestDraftKey } from "@/lib/guest-chat-client";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { Icon } from "@/components/pathly/Icon";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { useDiscoveryStore } from "@/stores/useDiscoveryStore";
import { useChatRunStore } from "@/stores/useChatRunStore";
import { RunActivity } from "./RunActivity";
import { ChatMessage } from "./ChatMessage";
import { discoveryCountHint } from "@/lib/discovery-progress";
import { runFinished } from "@/types/chat-run";
import { useChatWait, chatRequestHint } from "@/lib/chat-availability";
import {
  chatSearchExample,
  chatSearchSuggestions,
} from "@/lib/chat-suggestions";

const workLabels = { Remote: "دورکار", Hybrid: "هیبرید", OnSite: "حضوری" };
export default function ChatExperience({
  fullHeight = false,
}: {
  fullHeight?: boolean;
}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? (
    <AuthenticatedChat fullHeight={fullHeight} />
  ) : (
    <GuestChat fullHeight={fullHeight} />
  );
}
function AuthenticatedChat({ fullHeight }: { fullHeight: boolean }) {
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimRetry, setClaimRetry] = useState(0);
  const { user, isAuthenticated } = useAuthStore();
  const chat = useChatStore();
  const runs = useChatRunStore();
  const wait = useChatWait(runs.availability);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void useChatRunStore.getState().loadAvailability();
    const refresh = () => void useChatRunStore.getState().loadAvailability();
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(timer);
    };
  }, [user?.id, hydrated]);
  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const owner = isAuthenticated ? (user?.id ?? null) : null;
    useChatStore.getState().reset(owner);
    useDiscoveryStore.getState().reset();
    useChatRunStore.getState().reset();
    useChatRunStore.setState({ availability: null });
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
        let id =
          new URLSearchParams(window.location.search).get("conversation") ??
          sessionStorage.getItem(importedKey);
        if (!id && sessionStorage.getItem(guestContinuationKey)) {
          const response = await apiClient.post(
            "/api/chat/guest/claim",
            {},
            { withCredentials: true },
          );
          id = (response.data.data ?? response.data).conversationId;
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
      useChatRunStore.getState().reset();
    };
  }, [hydrated, isAuthenticated, user?.id, claimRetry]);
  useEffect(() => {
    const id = chat.active?.id;
    if (id) {
      const url = new URL(window.location.href);
      if (url.searchParams.get("conversation") !== id) {
        url.searchParams.set("conversation", id);
        window.history.replaceState(window.history.state, "", url);
      }
    }
    if (
      id &&
      !useChatRunStore.getState().runs.some((run) => run.conversationId === id)
    )
      void useChatRunStore.getState().restore(id);
  }, [chat.active?.id]);
  useEffect(() => {
    if (chat.active?.messages.length)
      end.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [chat.active?.messages.length]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (claiming || claimError || runs.pending || wait.seconds > 0) return;
    if (await runs.start(draft.trim(), chat.active?.id)) {
      setDraft("");
      sessionStorage.removeItem(guestDraftKey);
    }
  }
  if (!hydrated || !isAuthenticated || !user)
    return (
      <PageLoading
        title="در حال بررسی ورود…"
        description="گفتگوی شخصی‌ات را آماده می‌کنیم."
        layout="chat"
      />
    );
  const context = chat.active?.context.searchContext;
  const ready = Boolean(context?.targetRoles.length);
  return (
    <section
      className={
        fullHeight
          ? "flex h-full min-h-0 flex-col overflow-hidden bg-light-surface dark:bg-dark-surface"
          : "glass-card chat-workspace flex h-[calc(100dvh-180px)] min-h-[420px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-light-surface shadow-xl shadow-slate-900/5 dark:border-dark-border dark:bg-dark-surface md:h-[calc(100dvh-136px)] md:min-h-[480px]"
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/50 p-4 dark:border-dark-border dark:bg-dark-card/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 text-white shadow-md">
            <Icon name="wand-magic-sparkles" className="text-sm" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-white">
              دستیار هوشمند شغلی کارمچ
            </h1>
            <p className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
              {runs.pending || chat.pending || claiming ? (
                <LoadingSpinner className="h-3 w-3" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
              {runs.pending
                ? "در حال بررسی درخواست"
                : chat.pending || claiming
                  ? "در حال آماده‌کردن گفتگو"
                  : "فعال و آماده تحلیل"}
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
            disabled={
              chat.pending || runs.pending || claiming || Boolean(claimError)
            }
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete("conversation");
              window.history.replaceState(window.history.state, "", url);
              chat.startNew();
              runs.reset();
              setDraft("");
            }}
            className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-400 transition-all hover:text-rose-500 dark:bg-dark-card"
          >
            <Icon name="plus" className="ml-1" />
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
            disabled={
              chat.pending || runs.pending || claiming || Boolean(claimError)
            }
            onChange={(event) => {
              if (event.target.value) {
                setDraft("");
                runs.reset();
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
            disabled={
              chat.pending || runs.pending || claiming || Boolean(claimError)
            }
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
        <LoadingState
          title="در حال آماده‌کردن گفتگو…"
          description="تاریخچه گفتگوی مهمان را به حسابت منتقل می‌کنیم."
          compact
          className="m-3"
        />
      )}
      {chat.error && (
        <p role="alert" className="bg-rose-500/10 p-3 text-xs text-rose-500">
          {chat.error}
        </p>
      )}
      {runs.error && (
        <p
          role="alert"
          className="bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400"
        >
          {runs.error}
        </p>
      )}
      {(runs.connection === "reconnecting" ||
        runs.connection === "disconnected") && (
        <div
          role="status"
          className="p-3 text-xs text-amber-600 dark:text-amber-400"
        >
          {runs.connection === "reconnecting" ? (
            "در حال اتصال دوباره… نتایج حفظ شده‌اند."
          ) : (
            <button
              type="button"
              onClick={runs.reconnect}
              className="underline"
            >
              برقراری دوباره اتصال
            </button>
          )}
        </div>
      )}
      <div
        role="log"
        aria-label="پیام‌های گفتگو"
        aria-live="polite"
        aria-relevant="additions"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-xs leading-relaxed"
      >
        {!chat.active?.messages.length && (
          <ChatMessage role="assistant">
            <p className="font-bold text-brand-500">
              سلام {user.firstName}! من دستیار شغلی هوشمند کارمچ هستم.
            </p>
            <p>
              برای جستجوی دقیق، تعداد، عنوان شغل و شهر را مشخص کنید. یکی از
              نمونه‌های زیر را می‌توانید انتخاب و ویرایش کنید:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {chatSearchSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setDraft(prompt)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] text-slate-500 transition-colors hover:border-brand-500 hover:text-brand-500 dark:border-dark-border dark:text-slate-400"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </ChatMessage>
        )}
        {chat.active?.messages
          .filter(
            (message) =>
              !runs.runs.some(
                (run) =>
                  run.assistantMessageId === message.id &&
                  !runFinished(run.status),
              ),
          )
          .map((message) => (
            <Fragment key={message.id}>
              <ChatMessage
                role={message.role === "user" ? "user" : "assistant"}
                content={message.content}
              />
              {runs.runs
                .filter((run) => run.userMessageId === message.id)
                .map((run) => (
                  <RunActivity key={run.runId} run={run} />
                ))}
            </Fragment>
          ))}
        {runs.pendingMessage && (
          <ChatMessage role="user" content={runs.pendingMessage} pending />
        )}
        {runs.runs
          .filter((run) => !run.userMessageId)
          .map((run) => (
            <div key={run.runId} className="space-y-3">
              <ChatMessage role="user" content={run.message} />
              <RunActivity run={run} />
            </div>
          ))}
        {chat.pending && (
          <LoadingState
            title="در حال دریافت گفتگو…"
            description="پیام‌ها و تاریخچه را دریافت می‌کنیم."
            compact
          />
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
            <span>
              نتایج جستجوی منابع ایرانی پایین گفتگو نمایش داده می‌شود.
            </span>
          </div>
        </details>
      )}
      {ready &&
        chat.active &&
        context &&
        !runs.runs.length &&
        !runs.pending && (
          <DiscoveryPanel
            conversationId={chat.active.id}
            context={context}
            trigger={0}
          />
        )}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50/50 p-4 dark:border-dark-border dark:bg-dark-card/50">
        <p className="mb-2 text-[10px] leading-5 text-slate-500 dark:text-slate-400">
          {discoveryCountHint}
          <span className="block">{chatRequestHint}</span>
        </p>
        {!runs.pending && wait.seconds > 0 && (
          <div
            role="status"
            className="mb-3 rounded-xl bg-brand-500/10 p-3 text-xs text-brand-600 dark:text-brand-200"
          >
            {wait.active
              ? "درخواست قبلی هنوز در حال انجام است."
              : `درخواست بعدی ${wait.seconds.toLocaleString("fa-IR")} ثانیه دیگر؛ متنت را می‌توانی آماده کنی.`}
            {wait.active && runs.availability?.activeRunId && (
              <button
                type="button"
                className="mr-2 underline"
                onClick={() => void runs.followActive()}
              >
                مشاهده اجرای قبلی
              </button>
            )}
          </div>
        )}
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
            disabled={
              chat.pending || runs.pending || claiming || Boolean(claimError)
            }
            placeholder={`مثلاً: ${chatSearchExample}`}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-800 focus:border-brand-500 focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-white"
          />
          <button
            type="submit"
            aria-label="ارسال پیام"
            disabled={
              chat.pending ||
              runs.pending ||
              claiming ||
              Boolean(claimError) ||
              wait.seconds > 0 ||
              !draft.trim()
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
