"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  useResumeDraftStore,
  type ResumeDraft,
} from "@/stores/useResumeDraftStore";
import { demoJobs, unwrap } from "@/lib/pathly-data";
import { Icon } from "./Icon";
import { DemoNotice } from "./DemoNotice";
import { recordEvent } from "@/lib/analytics";
import { WorkspaceHeading, accountField } from "./AccountWorkspace";
import { resumeGenerationError } from "@/lib/resume-generation-error";
import {
  LoadingState,
  LoadingSpinner,
  PageLoading,
} from "@/components/ui/LoadingState";

interface SavedResume {
  id: string;
  jobId: string;
  version: number;
  job?: { title: string };
  content: {
    name?: string;
    email?: string;
    title?: string;
    summary?: string;
    highlights?: string[];
    skills_to_emphasize?: string[];
  };
}

interface ResumeProposal {
  id: string;
  jobId: string;
  baseVersion: number;
  status: string;
  content: SavedResume["content"];
}
export function ResumeStudio() {
  const { user, isAuthenticated, isProfileComplete } = useAuthStore();
  const { owner, draft, initialize, update } = useResumeDraftStore();
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(isAuthenticated);
  const [busyLabel, setBusyLabel] = useState("");
  const [notice, setNotice] = useState("");
  const [jobId, setJobId] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [targetJob, setTargetJob] = useState<{
    title: string;
    company: string;
  } | null>(null);
  const [base, setBase] = useState<{
    version: number;
    content: SavedResume["content"];
  } | null>(null);
  const [mode, setMode] = useState<"base" | "tailored">("base");
  const [baseDirty, setBaseDirty] = useState(false);
  const [proposals, setProposals] = useState<ResumeProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [tailoredDraft, setTailoredDraft] = useState<ResumeDraft | null>(null);
  const preview =
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "design";
  const currentOwner =
    isAuthenticated && user ? user.id : preview ? "demo" : "guest";
  useEffect(() => {
    setTargetJob(null);
    if (!jobId || jobId.startsWith("demo-")) return;
    let alive = true;
    apiClient
      .get(`/api/jobs/${jobId}`)
      .then((response) => {
        const job = unwrap(response.data) as {
          title?: string;
          company?: string;
        };
        if (alive && job.title && job.company)
          setTargetJob({ title: job.title, company: job.company });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [jobId]);
  function restore(resume: SavedResume) {
    setMode("tailored");
    setTailoredDraft(null);
    setResumeId(resume.id);
    setJobId(resume.jobId);
    update({
      name: resume.content.name ?? "",
      email: resume.content.email ?? "",
      title: resume.content.title ?? "",
      summary: resume.content.summary ?? "",
      skills: (resume.content.skills_to_emphasize ?? []).join(", "),
      projects: (resume.content.highlights ?? []).join("\n"),
    });
  }
  function showContent(content: SavedResume["content"]) {
    update({
      name: content.name ?? "",
      email: content.email ?? "",
      title: content.title ?? "",
      summary: content.summary ?? "",
      skills: (content.skills_to_emphasize ?? []).join(", "),
      projects: (content.highlights ?? []).join("\n"),
    });
  }
  function edit(values: Partial<ResumeDraft>) {
    update(values);
    if (mode === "base") setBaseDirty(true);
  }
  useEffect(() => {
    setResumeId("");
    setResumes([]);
    setBase(null);
    setProposals([]);
    setBaseDirty(false);
    setTailoredDraft(null);
    setMode("base");
    setNotice("");
    const requestedJob =
      new URLSearchParams(window.location.search).get("job") ?? "";
    setJobId(requestedJob);
    initialize(
      currentOwner,
      user ? user.firstName + " " + user.lastName : "",
      user?.email,
    );
    if (!isAuthenticated) {
      setFetching(false);
      setBusy(false);
      return;
    }
    let alive = true;
    setFetching(true);
    setBusy(true);
    Promise.allSettled([
      apiClient.get("/api/resumes/base"),
      apiClient.get("/api/resumes"),
    ]).then((responses) => {
      if (!alive || useResumeDraftStore.getState().owner !== currentOwner)
        return;
      if (responses[0].status === "fulfilled") {
        const loaded = unwrap(responses[0].value.data);
        setBase(loaded);
        showContent(loaded.content);
      } else setNotice(resumeGenerationError(responses[0].reason));
      if (responses[1].status === "fulfilled") {
        const rows = unwrap(responses[1].value.data) as SavedResume[];
        setResumes(rows);
        const saved = rows.find((row) => row.jobId === requestedJob);
        if (saved) restore(saved);
      }
      setBusy(false);
      setFetching(false);
    });
    return () => {
      alive = false;
    };
  }, [currentOwner, initialize]);
  useEffect(() => {
    setProposals([]);
    setSelectedProposalId("");
    if (!isAuthenticated || !jobId) return;
    let alive = true;
    apiClient
      .get("/api/resumes/proposals?jobId=" + encodeURIComponent(jobId))
      .then((response) => {
        if (!alive) return;
        const rows = unwrap(response.data) as ResumeProposal[];
        setProposals(rows);
        setSelectedProposalId(
          rows.find((row) => row.status === "PROPOSED")?.id ?? "",
        );
      })
      .catch(() => {
        if (alive) setNotice("دریافت پیشنهادهای رزومه انجام نشد.");
      });
    return () => {
      alive = false;
    };
  }, [jobId, currentOwner]);
  function draftPayload() {
    return {
      summary: draft.summary,
      highlights: draft.projects
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      skills_to_emphasize: draft.skills
        .split(/[,،]/)
        .map((value) => value.trim())
        .filter(Boolean),
    };
  }
  async function saveBase() {
    const ownerAtStart = currentOwner;
    setBusy(true);
    setBusyLabel("در حال ذخیره رزومه پایه…");
    setNotice("");
    try {
      const response = await apiClient.put("/api/resumes/base", {
        ...draftPayload(),
        version: base?.version ?? 0,
      });
      if (useResumeDraftStore.getState().owner !== ownerAtStart) return;
      setBase(unwrap(response.data));
      setBaseDirty(false);
      setNotice("رزومه پایه ذخیره شد.");
    } catch (error) {
      if (useResumeDraftStore.getState().owner === ownerAtStart)
        setNotice(resumeGenerationError(error));
    } finally {
      if (useResumeDraftStore.getState().owner === ownerAtStart) setBusy(false);
    }
  }
  async function acceptProposal() {
    if (!selectedProposalId) return;
    const ownerAtStart = currentOwner;
    setBusy(true);
    setBusyLabel("در حال ثبت نسخه مخصوص آگهی…");
    setNotice("");
    try {
      const response = await apiClient.post(
        "/api/resumes/proposals/" + selectedProposalId + "/accept",
      );
      if (useResumeDraftStore.getState().owner !== ownerAtStart) return;
      const saved = unwrap(response.data) as SavedResume;
      restore(saved);
      setResumes((rows) => [
        saved,
        ...rows.filter((row) => row.id !== saved.id),
      ]);
      setProposals((rows) =>
        rows.map((row) =>
          row.id === selectedProposalId ? { ...row, status: "ACCEPTED" } : row,
        ),
      );
      setNotice(
        "پیشنهاد پذیرفته شد. نسخه مخصوص آگهی آماده ویرایش و دانلود است.",
      );
    } catch (error) {
      if (useResumeDraftStore.getState().owner === ownerAtStart)
        setNotice(resumeGenerationError(error));
    } finally {
      if (useResumeDraftStore.getState().owner === ownerAtStart) setBusy(false);
    }
  }
  async function tailor() {
    setNotice("");
    const target = demoJobs.find((job) => job.id === jobId) ?? demoJobs[0];
    if (currentOwner === "demo") {
      update({ title: target.title });
      setNotice("عنوان هدف رزومه نمونه تنظیم شد.");
      return;
    }
    if (!jobId || jobId.startsWith("demo-")) {
      setNotice("ابتدا یک فرصت واقعی را در بخش کشف فرصت‌ها انتخاب کنید.");
      return;
    }
    if (!base?.version || baseDirty) {
      setNotice("ابتدا آخرین تغییرات رزومه پایه را ذخیره کنید.");
      return;
    }
    const generationOwner = currentOwner;
    setBusy(true);
    setBusyLabel("در حال ساخت پیشنهاد رزومه…");
    try {
      const response = await apiClient.post<
        ResumeProposal | { success: boolean; data: ResumeProposal }
      >("/api/resume/generate", { jobId });
      if (useResumeDraftStore.getState().owner !== generationOwner) return;
      const saved = unwrap(response.data);
      setProposals((rows) => [saved, ...rows]);
      setSelectedProposalId(saved.id);
      setNotice(
        "پیشنهاد جدید آماده شد. آن را بررسی و در صورت تأیید بپذیرید تا نسخه مخصوص آگهی ساخته شود.",
      );
    } catch (error) {
      if (useResumeDraftStore.getState().owner === generationOwner)
        setNotice(resumeGenerationError(error));
    } finally {
      if (useResumeDraftStore.getState().owner === generationOwner)
        setBusy(false);
    }
  }
  async function save() {
    if (!resumeId || mode !== "tailored") {
      setNotice("ابتدا برای یک فرصت واقعی رزومه بسازید.");
      return false;
    }
    const response = await apiClient.put(`/api/resumes/${resumeId}`, {
      summary: draft.summary,
      highlights: draft.projects
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      skills_to_emphasize: draft.skills
        .split(/[,،]/)
        .map((value) => value.trim())
        .filter(Boolean),
    });
    const saved = unwrap(response.data) as SavedResume;
    if (useResumeDraftStore.getState().owner === currentOwner) {
      setResumes((rows) =>
        rows.map((row) => (row.id === saved.id ? saved : row)),
      );
      setTailoredDraft(null);
    }
    return true;
  }
  async function saveEdits() {
    const ownerAtStart = currentOwner;
    setBusy(true);
    setBusyLabel("در حال ذخیره ویرایش رزومه…");
    setNotice("");
    try {
      if (
        (await save()) &&
        useResumeDraftStore.getState().owner === ownerAtStart
      )
        setNotice("ویرایش رزومه ذخیره شد.");
    } catch {
      setNotice("ذخیره انجام نشد. مهارت جدید را ابتدا در پروفایل ثبت کنید.");
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (currentOwner === "demo") {
      window.print();
      return;
    }
    setBusy(true);
    setBusyLabel("در حال آماده‌کردن و دانلود PDF…");
    setNotice("");
    const ownerAtStart = currentOwner;
    try {
      if (!(await save())) return;
      const response = await apiClient.get(`/api/resumes/${resumeId}/pdf`, {
        responseType: "blob",
      });
      if (useResumeDraftStore.getState().owner !== ownerAtStart) return;
      const url = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "resume.pdf";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      recordEvent("Resume Downloaded", resumeId);
      setNotice("فایل PDF رزومه دانلود شد.");
    } catch {
      setNotice("دانلود PDF انجام نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }
  const inputClass = accountField;
  const proposal = proposals.find((row) => row.id === selectedProposalId);
  const current = resumes.find((row) => row.id === resumeId);
  if (fetching)
    return (
      <PageLoading
        title="در حال دریافت رزومه‌ها…"
        description="رزومه پایه و نسخه‌های ذخیره‌شده‌ات را دریافت می‌کنیم."
        layout="form"
      />
    );
  return (
    <section className="mx-auto max-w-6xl space-y-7">
      {busy && (
        <LoadingState
          title={busyLabel || "در حال پردازش رزومه…"}
          description="نتیجه پس از دریافت پاسخ نمایش داده می‌شود؛ این صفحه را باز نگه دار."
          compact
        />
      )}
      <WorkspaceHeading
        eyebrow="حساب من / رزومه‌ساز"
        title="رزومه‌ای برای فرصت بعدی تو"
        description="رزومه پایه‌ات را ذخیره کن، پیشنهاد متناسب با آگهی را بررسی کن و سپس نسخه مخصوص آن را بپذیر."
        action={
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-xs font-bold text-brand-500"
          >
            مشاهده فرصت‌ها <Icon name="arrow-left" />
          </Link>
        }
      />
      {currentOwner !== "demo" && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-dark-border dark:bg-dark-surface">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              aria-pressed={mode === "base"}
              onClick={() => {
                if (!base || mode === "base") return;
                if (mode === "tailored") setTailoredDraft({ ...draft });
                setMode("base");
                showContent(base.content);
              }}
              className="rounded-xl bg-brand-500/10 px-4 py-2 text-xs font-bold text-brand-500"
            >
              رزومه پایه
            </button>
            <button
              type="button"
              disabled={busy || !current || baseDirty}
              aria-pressed={mode === "tailored"}
              onClick={() => {
                if (!current || mode === "tailored") return;
                setMode("tailored");
                if (tailoredDraft) update(tailoredDraft);
                else showContent(current.content);
              }}
              className="rounded-xl border px-4 py-2 text-xs font-bold"
            >
              نسخه مخصوص آگهی
            </button>
            {mode === "base" && (
              <button
                type="button"
                disabled={busy || !base}
                onClick={saveBase}
                className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white"
              >
                ذخیره رزومه پایه
              </button>
            )}
          </div>
          <p className="text-xs leading-7 text-slate-500">
            {mode === "base"
              ? "متن رزومه موجودت را در خلاصه و سوابق وارد کن و مهارت‌های ثبت‌شده‌ات را انتخاب کن. سفارشی‌سازی همیشه از آخرین رزومه پایه ذخیره‌شده انجام می‌شود."
              : "ویرایش‌های این بخش فقط برای آگهی انتخاب‌شده ذخیره می‌شوند. ساخت پیشنهاد جدید، نسخه فعلی را تغییر نمی‌دهد."}
          </p>
          <p className="text-xs text-brand-500">
            {baseDirty
              ? "تغییرات رزومه پایه ذخیره نشده‌اند؛ قبل از ساخت پیشنهاد آن‌ها را ذخیره کن."
              : base?.version
                ? `رزومه پایه ذخیره شده · نسخه ${base.version.toLocaleString("fa-IR")}`
                : "رزومه پایه هنوز ذخیره نشده است."}
          </p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-dark-border dark:bg-dark-surface sm:p-4">
        {[
          ["رزومه پایه", Boolean(base?.version)],
          ["پذیرش پیشنهاد", Boolean(resumeId)],
          ["دریافت رزومه", Boolean(resumeId)],
        ].map(([label, done], index) => (
          <div
            key={String(label)}
            className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-right"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-brand-500/10 text-brand-500" : "bg-slate-100 text-slate-400 dark:bg-dark-card"}`}
            >
              {index + 1}
            </span>
            <span className="text-[10px] font-semibold sm:text-xs">
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-brand-500/20 bg-brand-500/5 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
            <Icon name="briefcase" />
          </span>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold text-brand-500">
              فرصت هدف رزومه
            </p>
            <h2 className="break-words text-sm font-extrabold">
              {targetJob?.title ??
                (jobId ? "آگهی منتخب شما" : "هنوز آگهی انتخاب نکرده‌ای")}
            </h2>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              {targetJob?.company ??
                (jobId
                  ? "نسخه رزومه براساس اطلاعات ثبت‌شده شما ساخته می‌شود."
                  : "اول فرصت دلخواهت را پیدا کن؛ بعد رزومه‌اش را اینجا بساز.")}
            </p>
            <Link
              href="/jobs"
              className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-brand-500"
            >
              {jobId ? "تغییر آگهی" : "انتخاب آگهی"}
              <Icon name="arrow-left" />
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={tailor}
            disabled={
              busy ||
              (currentOwner !== "demo" &&
                (!jobId || !base?.version || baseDirty))
            }
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-brand-600 disabled:opacity-40"
          >
            {busy && busyLabel === "در حال ساخت پیشنهاد رزومه…" ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <Icon name="wand-magic-sparkles" />
            )}
            <span>
              {busy && busyLabel === "در حال ساخت پیشنهاد رزومه…"
                ? "در حال ساخت پیشنهاد…"
                : "سفارشی‌سازی برای شغل منتخب"}
            </span>
          </button>
          <button
            onClick={download}
            disabled={
              busy ||
              (currentOwner !== "demo" && (!resumeId || mode !== "tailored"))
            }
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 dark:border-dark-border dark:bg-dark-surface dark:text-slate-200 disabled:opacity-40"
          >
            {busy && busyLabel === "در حال آماده‌کردن و دانلود PDF…" ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <Icon name="download" />
            )}
            <span>دانلود PDF</span>
          </button>
          {currentOwner !== "demo" && (
            <button
              disabled={busy || !resumeId || mode !== "tailored"}
              onClick={saveEdits}
              className="rounded-xl px-4 py-3 text-xs font-bold text-brand-500 disabled:opacity-40"
            >
              ذخیره ویرایش
            </button>
          )}
        </div>
      </div>
      {isAuthenticated && !isProfileComplete && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs leading-7 dark:border-dark-border dark:bg-dark-surface">
          <p>
            برای ساخت رزومه، مهارت‌ها و سابقه واقعی خود را در پروفایل تکمیل
            کنید.
          </p>
          <Link
            href="/profile"
            className="mt-2 inline-flex text-xs font-bold text-brand-500"
          >
            تکمیل اطلاعات رزومه
          </Link>
        </div>
      )}
      {currentOwner === "demo" && (
        <DemoNotice>
          رزومه پرهام رضایی نمونه مرجع است. پس از ورود اطلاعات حساب شما بارگذاری
          می‌شود.
        </DemoNotice>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-3 text-xs text-brand-500"
        >
          {notice}
        </p>
      )}
      {proposals.length > 0 && (
        <section
          aria-label="پیشنهادهای سفارشی‌سازی"
          className="space-y-4 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-5"
        >
          <h2 className="text-sm font-bold">بررسی پیشنهاد رزومه</h2>
          <select
            aria-label="پیشنهادهای رزومه"
            value={selectedProposalId}
            onChange={(event) => setSelectedProposalId(event.target.value)}
            className={accountField}
          >
            <option value="">انتخاب پیشنهاد</option>
            {proposals.map((row, index) => (
              <option
                key={row.id}
                value={row.id}
              >{`پیشنهاد ${proposals.length - index} · پایه نسخه ${row.baseVersion} · ${row.status === "ACCEPTED" ? "پذیرفته‌شده" : "در انتظار بررسی"}`}</option>
            ))}
          </select>
          {proposal && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div
                  aria-label="نسخه فعلی رزومه"
                  className="space-y-2 rounded-xl bg-white p-4 text-xs leading-7 dark:bg-dark-surface"
                >
                  <h3 className="font-bold">نسخه فعلی مخصوص آگهی</h3>
                  <p className="whitespace-pre-wrap">
                    {mode === "tailored"
                      ? draft.summary
                      : (current?.content.summary ??
                        "هنوز پیشنهادی برای این آگهی نپذیرفته‌ای.")}
                  </p>
                  <p>
                    {mode === "tailored"
                      ? draft.skills
                      : current?.content.skills_to_emphasize?.join("، ")}
                  </p>
                  <p className="whitespace-pre-wrap">
                    {mode === "tailored"
                      ? draft.projects
                      : current?.content.highlights?.join("\n")}
                  </p>
                </div>
                <div
                  aria-label="پیشنهاد جدید رزومه"
                  className="space-y-2 rounded-xl bg-white p-4 text-xs leading-7 dark:bg-dark-surface"
                >
                  <h3 className="font-bold">
                    پیشنهاد از رزومه پایه نسخه{" "}
                    {proposal.baseVersion.toLocaleString("fa-IR")}
                  </h3>
                  <p className="whitespace-pre-wrap">
                    {proposal.content.summary}
                  </p>
                  <p>{proposal.content.skills_to_emphasize?.join("، ")}</p>
                  <p className="whitespace-pre-wrap">
                    {proposal.content.highlights?.join("\n")}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-7 text-slate-500">
                با پذیرش پیشنهاد، آن را به‌عنوان نسخه فعلی این آگهی انتخاب
                می‌کنی. رزومه پایه حفظ می‌شود. پیشنهادهای قبلی در این فهرست باقی
                می‌مانند.
              </p>
              <button
                type="button"
                disabled={busy || baseDirty || proposal.status === "ACCEPTED"}
                onClick={acceptProposal}
                className="rounded-xl bg-brand-500 px-4 py-3 text-xs font-bold text-white disabled:opacity-40"
              >
                {proposal.status === "ACCEPTED"
                  ? "پیشنهاد پذیرفته شده"
                  : "پذیرش پیشنهاد و ساخت نسخه مخصوص آگهی"}
              </button>
            </>
          )}
        </section>
      )}
      {currentOwner !== "demo" && (
        <div>
          {resumes.length ? (
            <label className="block rounded-2xl border border-slate-200 bg-white p-5 text-xs font-bold dark:border-dark-border dark:bg-dark-surface">
              رزومه‌های ذخیره‌شده
              <select
                aria-label="رزومه‌های ذخیره‌شده"
                disabled={busy || baseDirty}
                value={resumeId}
                onChange={(e) => {
                  const saved = resumes.find(
                    (row) => row.id === e.target.value,
                  );
                  if (saved) restore(saved);
                }}
                className={`${accountField} mt-3`}
              >
                <option value="">انتخاب رزومه</option>
                {resumes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.job?.title ?? "رزومه شغلی"} — نسخه {row.version}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-xs leading-7 text-slate-500 dark:border-dark-border">
              {jobId
                ? "برای این آگهی هنوز رزومه‌ای نساخته‌ای. پس از ثبت اطلاعات واقعی‌ات، دکمه سفارشی‌سازی را بزن."
                : "هنوز رزومه‌ای ذخیره نشده است. ابتدا یک موقعیت مناسب را از بخش فرصت‌ها انتخاب کنید."}
            </p>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 rounded-3xl border border-slate-200 bg-white p-5 dark:border-dark-border dark:bg-dark-surface sm:p-7 lg:col-span-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <Icon name="file-lines" className="text-brand-500" />
            {mode === "base" ? "ویرایش رزومه پایه" : "ویرایش نسخه مخصوص آگهی"}
          </h2>
          <p className="text-xs leading-6 text-slate-500">
            نام و عنوان از پروفایلت گرفته می‌شوند. متن و مهارت‌های رزومه را قبل
            از دانلود مرور کن.
          </p>
          <div className="space-y-3 text-xs">
            <div>
              <label
                htmlFor="res-name"
                className="mb-1 block font-semibold text-slate-700 dark:text-slate-300"
              >
                نام و نام خانوادگی
              </label>
              <input
                id="res-name"
                value={draft.name}
                disabled={busy || currentOwner !== "demo"}
                onChange={(event) => update({ name: event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="res-title"
                className="mb-1 block font-semibold text-slate-700 dark:text-slate-300"
              >
                عنوان شغلی
              </label>
              <input
                id="res-title"
                value={draft.title}
                disabled={busy || currentOwner !== "demo"}
                onChange={(event) => update({ title: event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="res-summary"
                className="mb-1 block font-semibold text-slate-700 dark:text-slate-300"
              >
                خلاصه حرفه‌ای
              </label>
              <textarea
                id="res-summary"
                rows={3}
                value={draft.summary}
                disabled={busy}
                onChange={(event) => edit({ summary: event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="res-skills"
                className="mb-1 block font-semibold text-slate-700 dark:text-slate-300"
              >
                مهارت‌های اصلی (با ویرگول جدا کنید)
              </label>
              <input
                id="res-skills"
                dir="auto"
                value={draft.skills}
                disabled={busy}
                onChange={(event) => edit({ skills: event.target.value })}
                className={inputClass}
              />
            </div>
            {currentOwner !== "demo" && (
              <div>
                <label
                  htmlFor="res-projects"
                  className="mb-1 block font-semibold text-slate-700 dark:text-slate-300"
                >
                  سوابق / پروژه‌های ثبت‌شده توسط شما
                </label>
                <textarea
                  id="res-projects"
                  rows={3}
                  value={draft.projects}
                  disabled={busy}
                  onChange={(event) => edit({ projects: event.target.value })}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        </div>
        <div
          id="resume-print-area"
          className="min-w-0 min-h-[600px] space-y-7 break-words rounded-3xl border border-slate-200 bg-white p-5 text-xs text-slate-900 shadow-xl shadow-slate-900/5 sm:p-8 lg:col-span-7 lg:p-10"
        >
          <p className="flex items-center gap-2 text-[10px] font-bold text-slate-400 print:hidden">
            <Icon name="file-lines" />
            پیش‌نمایش رزومه
          </p>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-800 pb-5">
            <div>
              <h2
                id="preview-name"
                className="text-2xl font-black text-slate-900"
              >
                {draft.name || "نام شما"}
              </h2>
              <p
                id="preview-title"
                className="mt-1 text-xs font-bold text-slate-600"
              >
                {draft.title || "عنوان شغلی"}
              </p>
            </div>
            <div className="min-w-0 space-y-0.5 text-left text-[11px] text-slate-500">
              <p>ایمیل: {draft.email}</p>
              {currentOwner === "demo" && (
                <>
                  <p>تلفن: ۰۹۱۲۰۰۰۰۰۰۰</p>
                  <p>گیت‌هاپ: github.com/parham</p>
                </>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="border-b border-slate-200 pb-1 text-xs font-extrabold uppercase tracking-wide text-slate-900">
              درباره من
            </h3>
            <p
              id="preview-summary"
              className="whitespace-pre-wrap leading-relaxed text-slate-700"
            >
              {draft.summary}
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="border-b border-slate-200 pb-1 text-xs font-extrabold uppercase tracking-wide text-slate-900">
              مهارت‌های اصلی
            </h3>
            <div id="preview-skills" className="flex flex-wrap gap-1.5">
              {[
                ...new Set(
                  draft.skills
                    .split(/[,،]/)
                    .map((skill) => skill.trim())
                    .filter(Boolean),
                ),
              ].map((skill) => (
                <span
                  key={skill}
                  className="rounded border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="border-b border-slate-200 pb-1 text-xs font-extrabold uppercase tracking-wide text-slate-900">
              سوابق / پروژه‌های برجسته
            </h3>
            {currentOwner === "demo" ? (
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{draft.projects.split("\n")[0]}</span>
                  <span className="font-normal text-slate-500">۱۴۰۲</span>
                </div>
                <p className="text-slate-600">
                  {draft.projects.split("\n").slice(1).join("\n")}
                </p>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-slate-600">
                {draft.projects || "هنوز سابقه یا پروژه‌ای ثبت نشده است."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
