import type { ReactNode } from "react";
import { Icon } from "@/components/pathly/Icon";

export function ChatMessage({
  role,
  content,
  children,
  pending = false,
}: {
  role: "user" | "assistant";
  content?: string;
  children?: ReactNode;
  pending?: boolean;
}) {
  const user = role === "user";
  return (
    <article
      dir="ltr"
      aria-label={
        pending ? "پیام در حال ارسال" : user ? "پیام شما" : "پاسخ دستیار"
      }
      className={`flex items-start gap-2 motion-safe:animate-slide-in ${user ? "justify-end" : "justify-start"}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${user ? "order-2 bg-brand-500/10 text-brand-600 dark:text-brand-200" : "order-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}
      >
        <Icon name={user ? "user" : "robot"} />
      </span>
      <div
        dir="rtl"
        className={`min-w-0 max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-right ${user ? "order-1 rounded-tr-sm bg-brand-500 text-white" : "order-2 rounded-tl-sm border border-slate-200 bg-slate-100 text-slate-800 dark:border-dark-border dark:bg-dark-card dark:text-slate-100"}`}
      >
        <div
          className={`flex flex-wrap items-center gap-2 text-[10px] font-bold ${user ? "text-white/90" : "text-emerald-700 dark:text-emerald-300"}`}
        >
          <span>{user ? "شما" : "دستیار کارمچ"}</span>
          {pending && <span className="font-normal">در حال ارسال…</span>}
        </div>
        {content !== undefined && (
          <p
            dir="auto"
            className="whitespace-pre-wrap break-words text-xs leading-7 [overflow-wrap:anywhere]"
          >
            {content}
          </p>
        )}
        {children}
      </div>
    </article>
  );
}
