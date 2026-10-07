"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Icon } from "@/components/pathly/Icon";
import {
  sendGuestMessage,
  type GuestProgressEvent,
} from "@/lib/guest-chat-stream";
import {
  progressLabel,
  stageLabels,
  sourceNames,
  discoveryCountHint,
  discoveryTargetLabel,
} from "@/lib/discovery-progress";
import { SourceProblems } from "./SourceProblems";
import type { DiscoveryIssue } from "@/types/discovery";
import {
  guestChatClient,
  guestContinuationKey,
  guestDraftKey,
  type GuestChatState,
} from "@/lib/guest-chat-client";

const prompts = [
  "دنبال شغل حسابداری توی تهران می‌گردم",
  "کار مدیر محصول دورکار می‌خوام",
  "فقط حضوری، حداقل حقوق ۳۰ میلیون",
];
export function GuestChat() {
  const [chat, setChat] = useState<GuestChatState | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activity, setActivity] = useState<GuestProgressEvent | undefined>();
  const [targetLabel, setTargetLabel] = useState("");
  const [sources, setSources] = useState<
    Array<{
      source: string;
      stage?: string;
      finished?: boolean;
      failed?: boolean;
      issue?: DiscoveryIssue;
    }>
  >([]);
  const request = useRef<AbortController | null>(null);
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
    return () => {
      request.current?.abort();
    };
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
    await sendMessage(draft);
  }
  async function sendMessage(message: string) {
    if (!message.trim() || pending || loading || !chat || chat.authRequired)
      return;
    setSubmitted(message.trim());
    setPending(true);
    setError("");
    setActivity({ type: "context.processing", data: {} });
    setTargetLabel("");
    setSources([]);
    const connection = new AbortController();
    request.current = connection;
    try {
      const state = await sendGuestMessage(
        message.trim(),
        (event) => {
          if (connection.signal.aborted) return;
          setActivity(event);
          if (event.type === "agent.started")
            setTargetLabel(discoveryTargetLabel(event.data.targetValidJobs));
          if (
            event.type.startsWith("source.") &&
            typeof event.data.source === "string"
          ) {
            const source = event.data.source;
            setSources((previous) => [
              ...previous.filter((item) => item.source !== source),
              {
                source,
                stage:
                  event.type === "source.progress"
                    ? String(event.data.stage)
                    : "search",
                finished: ["source.completed", "source.failed"].includes(
                  event.type,
                ),
                failed: event.type === "source.failed",
                ...(event.data.issue
                  ? { issue: event.data.issue as DiscoveryIssue }
                  : {}),
              },
            ]);
          }
        },
        connection.signal,
      );
      if (connection.signal.aborted) return;
      setChat(state);
      saveDraft("");
      sessionStorage.setItem(guestContinuationKey, "1");
    } catch (failure: unknown) {
      if (connection.signal.aborted) return;
      // Recover only a committed matching turn after losing the stream. Never
      // automatically POST again or consume another guest allowance.
      if (!(failure as { response?: unknown }).response) {
        try {
          const restored = (
            await guestChatClient.get<{ data: GuestChatState }>(
              "/api/chat/guest",
            )
          ).data.data;
          const lastUser = [...restored.messages]
            .reverse()
            .find((item) => item.role === "user");
          if (
            restored.messages.length > chat.messages.length &&
            lastUser?.content === message.trim()
          ) {
            setChat(restored);
            saveDraft("");
            sessionStorage.setItem(guestContinuationKey, "1");
            return;
          }
        } catch {
          /* Preserve the draft and report the original transport loss. */
        }
      }
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
            : !(failure as { response?: unknown }).response
              ? "اتصال نمایش وضعیت قطع شد؛ ممکن است درخواست هنوز در حال انجام باشد. متنت حفظ شده؛ تاریخچه را دوباره بررسی کن."
              : "پیام ارسال نشد؛ متنت حفظ شده. دوباره تلاش کن.",
        );
    } finally {
      if (!connection.signal.aborted) {
        setPending(false);
        setSubmitted("");
      }
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
              با کارمچ گفتگو کن
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
          <article aria-label="پیام در حال ارسال" className="flex justify-end">
            <p
              dir="auto"
              className="max-w-[90%] whitespace-pre-wrap rounded-2xl bg-brand-500 px-4 py-3 text-xs text-white"
            >
              {submitted}
            </p>
          </article>
        )}
        {chat?.discovery && (
          <section aria-label="نتایج جستجوی مهمان" className="space-y-3">
            <SourceProblems sources={chat.discovery.sources} />
            <h3 className="text-sm font-bold">فرصت‌های پیدا شده</h3>
            {chat.discovery.error && (
              <p role="alert" className="text-xs text-amber-600">
                {chat.discovery.issue?.message ??
                  "منابع جستجو پاسخ قابل استفاده ندادند؛ شرایطت حفظ شده است."}
              </p>
            )}
            {chat.discovery.sources.length > 0 && (
              <p className="text-xs text-slate-500">
                منابع بررسی‌شده:{" "}
                {chat.discovery.sources
                  .map((source) => source.source)
                  .join(" · ")}
              </p>
            )}
            {chat.discovery.jobs.map((job) => (
              <article
                key={job.sourceUrl}
                className="space-y-2 rounded-xl border border-slate-200 p-3 text-xs dark:border-dark-border"
              >
                <h4 className="font-bold">{job.title}</h4>
                <p>
                  {job.company} · {job.location ?? "شهر اعلام نشده"} ·{" "}
                  {job.workType
                    ? { Remote: "دورکار", Hybrid: "هیبرید", OnSite: "حضوری" }[
                        job.workType
                      ]
                    : "نوع حضور اعلام نشده"}
                </p>
                <p>
                  {job.salaryMin != null || job.salaryMax != null
                    ? `${[job.salaryMin, job.salaryMax]
                        .filter((value) => value != null)
                        .map((value) => value!.toLocaleString("fa-IR"))
                        .join(
                          " تا ",
                        )} ${job.currency === "TOMAN" ? "تومان" : "واحد اعلام نشده"}${job.salaryPeriod === "MONTHLY" ? " در ماه" : ""}`
                    : "حقوق اعلام نشده"}
                </p>
                {job.warnings.map((warning) => (
                  <p key={warning} className="text-amber-600">
                    {warning}
                  </p>
                ))}
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-500"
                >
                  مشاهده آگهی اصلی
                </a>
              </article>
            ))}
          </section>
        )}
        <div ref={end} />
      </div>
      {pending && (
        <section
          aria-label="فعالیت اجرای درخواست"
          className="mx-5 my-3 max-h-48 shrink-0 space-y-2 overflow-y-auto rounded-xl bg-brand-500/5 p-3 text-xs"
        >
          <p
            role="status"
            aria-live="polite"
            className="font-semibold text-brand-500"
          >
            {progressLabel(activity)}
          </p>
          {targetLabel && activity?.type !== "agent.started" && (
            <p>{targetLabel}</p>
          )}
          {sources.map((source) => (
            <p key={source.source}>
              {sourceNames[source.source] ?? source.source}:{" "}
              {source.finished
                ? source.failed
                  ? "بررسی کامل نشد"
                  : "بررسی تمام شد"
                : (stageLabels[source.stage ?? ""] ??
                  "در حال جستجوی لینک آگهی‌ها")}
            </p>
          ))}
          <SourceProblems sources={sources} />
        </section>
      )}
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
      {chat &&
        chat.context.searchContext.targetRoles.length > 0 &&
        (!chat.discovery || chat.discovery.error) &&
        !chat.authRequired && (
          <button
            type="button"
            disabled={pending || loading}
            onClick={() => void sendMessage("دوباره جستجو کن")}
            className="mx-5 mb-3 rounded-xl bg-brand-500 px-4 py-3 text-xs font-bold text-white disabled:opacity-40"
          >
            {chat.discovery?.error
              ? "تلاش دوباره برای جستجو"
              : "جستجوی فرصت‌های شغلی"}
          </button>
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
        <p className="mb-2 text-[10px] leading-5 text-slate-500 dark:text-slate-400">
          {discoveryCountHint}
        </p>
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
            placeholder="عنوان شغلی، شهر و شرایط دلخواهت را بنویس…"
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
          · تا پایان سهمیه می‌توانی گفتگو را ادامه بدهی.
        </p>
      </form>
    </section>
  );
}
