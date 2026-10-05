'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Job, MatchResult } from '@/types/job';
import { demoJobs, toPathlyJob, unwrap, type PathlyJob } from '@/lib/pathly-data';
import { Icon } from './Icon';
import { DemoNotice } from './DemoNotice';

export function JobsView({ initialJobId }: { initialJobId?: string }) {
  const { isAuthenticated, user } = useAuthStore();
  const [jobs, setJobs] = useState<PathlyJob[]>(demoJobs);
  const [selectedId, setSelectedId] = useState(initialJobId ?? demoJobs[0].id);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('all');
  const [junior, setJunior] = useState(true);
  const [frontend, setFrontend] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(true);
  const [reload, setReload] = useState(0);
  const [matches, setMatches] = useState<Record<string, MatchResult>>({});
  useEffect(() => {
    let alive = true;
    setMatches({});
    if (!isAuthenticated) { setJobs(demoJobs); setDemo(true); setSelectedId(initialJobId ?? demoJobs[0].id); return; }
    setDemo(false); setJobs([]); setJunior(false); setFrontend(false); setLoading(true); setError('');
    async function load() {
      try {
        const response = await apiClient.get<{ items: Job[] } | { success: boolean; data: { items: Job[] } }>('/api/jobs?limit=50');
        const rows = unwrap(response.data).items.map(toPathlyJob);
        if (initialJobId && !rows.some(row => row.id === initialJobId)) {
          const detail = await apiClient.get<Job | { success: boolean; data: Job }>(`/api/jobs/${initialJobId}`);
          rows.unshift(toPathlyJob(unwrap(detail.data)));
        }
        if (alive) { setJobs(rows); setSelectedId(initialJobId ?? rows[0]?.id ?? ''); }
      } catch { if (alive) setError('دریافت فرصت‌ها ممکن نشد. دوباره تلاش کنید.'); }
      finally { if (alive) setLoading(false); }
    }
    void load();
    return () => { alive = false; };
  }, [isAuthenticated, user?.id, initialJobId, reload]);
  const filtered = useMemo(() => jobs.filter(job => {
    const terms = [job.title, job.company, ...job.matchedSkills].join(' ').toLowerCase();
    return terms.includes(query.toLowerCase()) &&
      (location === 'all' || location === 'remote' && job.isRemote || location === 'hybrid' && job.isHybrid || location === 'tehran' && /tehran|تهران/i.test(job.location)) &&
      (!junior || /junior|جونیور|کارآموز/i.test(job.title + job.type)) &&
      (!frontend || /react|فرانت|frontend|front.end/i.test(terms));
  }), [jobs, query, location, junior, frontend]);
  const selected = filtered.find(job => job.id === selectedId) ?? filtered[0];
  const match = selected ? matches[selected.id] : undefined;
  useEffect(() => {
    if (!selected || selected.demo || !isAuthenticated || matches[selected.id]) return;
    let alive = true;
    const id = selected.id;
    apiClient.post<MatchResult | { success: boolean; data: MatchResult }>(`/api/matching/${id}`).then(response => {
      if (alive) setMatches(current => ({ ...current, [id]: unwrap(response.data) }));
    }).catch(() => {});
    return () => { alive = false; };
  }, [selected?.id, isAuthenticated, matches]);
  const score = match?.matchScore ?? selected?.score;
  const matched = match?.breakdown.skills.matched ?? selected?.matchedSkills ?? [];
  const missing = match?.breakdown.skills.missing ?? selected?.missingSkills ?? [];
  const showDemo = () => { setJobs(demoJobs); setDemo(true); setSelectedId(demoJobs[0].id); setJunior(true); setFrontend(true); setError(''); };
  return <section className="animate-fade-in space-y-6">
    <div className="glass-card space-y-3 rounded-2xl border border-slate-200 bg-light-surface p-4 dark:border-dark-border dark:bg-dark-surface">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1"><Icon name="magnifying-glass" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" /><input aria-label="جستجوی فرصت‌ها" value={query} onChange={event => setQuery(event.target.value)} placeholder="جستجو بر اساس عنوان شغلی، مهارت یا شرکت..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-xs text-slate-800 focus:border-brand-500 focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-white" /></div>
        <select aria-label="شهر و نوع حضور" value={location} onChange={event => setLocation(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 focus:outline-none dark:border-dark-border dark:bg-dark-card dark:text-slate-300"><option value="all">همه شهرها / نوع حضور</option><option value="remote">دورکاری (Remote)</option><option value="tehran">تهران</option><option value="hybrid">هیبرید / نیمه‌حضوری</option></select>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-xs dark:border-dark-border/50">
        <span className="font-medium text-slate-400">فیلترهای فعال:</span>
        {junior && <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/10 px-2.5 py-1 font-semibold text-brand-500">سطح جونیور / کارآموز<button aria-label="حذف فیلتر جونیور" onClick={() => setJunior(false)}><Icon name="xmark" /></button></span>}
        {frontend && <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-500">فرانت‌اند (React / Web)<button aria-label="حذف فیلتر فرانت‌اند" onClick={() => setFrontend(false)}><Icon name="xmark" /></button></span>}
        {!junior && !frontend && location === 'all' && <span className="text-slate-400">بدون محدودیت</span>}
      </div>
    </div>
    {demo ? <DemoNotice>آگهی‌ها و امتیازهای این نما همان نمونه‌های مرجع هستند.</DemoNotice> : <p className="text-[10px] text-slate-400">فرصت‌های دریافت‌شده از JobMatch <button onClick={showDemo} className="mr-2 text-brand-500">مشاهده نمونه طراحی</button></p>}
    {demo && isAuthenticated && <button onClick={() => setReload(current => current + 1)} className="text-xs text-brand-500">بازگشت به فرصت‌های واقعی</button>}
    {loading && <p role="status" className="text-xs text-slate-400">در حال دریافت فرصت‌ها…</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-500/10 p-4 text-xs text-rose-500">{error}<button onClick={() => setReload(current => current + 1)} className="mr-3 underline">تلاش دوباره</button></p>}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="max-h-[700px] space-y-3 overflow-y-auto pr-1 lg:col-span-5">
        {!loading && !filtered.length && <p className="p-4 text-xs text-slate-400">هیچ شغلی با این مشخصات یافت نشد.</p>}
        {filtered.map(job => <button key={job.id} onClick={() => setSelectedId(job.id)} aria-pressed={selected?.id === job.id} className={`interactive-hover w-full space-y-2 rounded-2xl border p-4 text-right transition-all ${selected?.id === job.id ? 'border-brand-500 bg-brand-500/5' : 'border-slate-200 bg-light-surface dark:border-dark-border dark:bg-dark-surface'}`}>
          <div className="flex items-start justify-between"><div className="space-y-1"><h2 className="text-sm font-bold text-slate-800 dark:text-white">{job.title}</h2><p className="text-xs text-slate-400">{job.company} • {job.locationText}</p></div>{job.score !== undefined && <span className="rounded-xl bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-500">{job.score}٪</span>}</div>
          <div className="flex flex-wrap gap-1 text-[10px]">{job.matchedSkills.map(skill => <span key={skill} className="rounded bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-dark-card dark:text-slate-300">{skill}</span>)}</div>
        </button>)}
      </div>
      <div className="glass-card sticky top-6 h-fit rounded-2xl border border-slate-200 bg-light-surface p-6 dark:border-dark-border dark:bg-dark-surface lg:col-span-7">
        {selected ? <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-dark-border"><div className="space-y-1"><h2 className="text-xl font-bold text-slate-800 dark:text-white">{selected.title}</h2><p className="text-xs font-medium text-slate-400">{selected.company} • {selected.locationText}</p></div>{score !== undefined && <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-emerald-500"><span className="text-2xl font-black">{Math.round(score)}٪</span><span className="text-[10px] font-bold">تطابق با شما</span></div>}</div>
          <div className="space-y-2"><h3 className="text-xs font-bold uppercase text-slate-400">شرح موقعیت شغلی</h3><p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">{selected.description}</p></div>
          <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><h3 className="flex items-center gap-1.5 text-xs font-bold text-emerald-500"><Icon name="circle-check" />{selected.demo || match ? 'مهارت‌های منطبق با شما' : 'مهارت‌های موردنیاز آگهی'} ({matched.length})</h3><div className="flex flex-wrap gap-1">{matched.map(skill => <span key={skill} className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">{skill}</span>)}</div></div>
            <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><h3 className="flex items-center gap-1.5 text-xs font-bold text-amber-500"><Icon name="triangle-exclamation" />شکاف مهارت (Skill Gap)</h3><div className="flex flex-wrap gap-1">{missing.map(skill => <span key={skill} className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300">{skill}</span>)}{!selected.demo && !match && <span className="text-[10px] text-slate-400">تحلیل تطابق هنوز دریافت نشده است.</span>}</div></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-dark-border"><span className="text-xs text-slate-400">محدوده حقوق: {selected.salary}</span><Link href={`/resume?job=${selected.id}`} className="rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600">سفارشی‌سازی رزومه برای این شغل</Link></div>
        </div> : <div className="space-y-2 py-12 text-center text-slate-400"><Icon name="hand-pointer" className="text-3xl" /><p className="text-xs">یک موقعیت شغلی را برای مشاهده جزئیات انتخاب کنید.</p></div>}
      </div>
    </div>
  </section>;
}
