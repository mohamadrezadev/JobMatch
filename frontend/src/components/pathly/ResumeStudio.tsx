'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { useResumeDraftStore, type ResumeDraft } from '@/stores/useResumeDraftStore';
import { demoJobs, unwrap } from '@/lib/pathly-data';
import type { Profile, UserSkill } from '@/types/user';
import { Icon } from './Icon';
import { DemoNotice } from './DemoNotice';

export function ResumeStudio() {
  const { user, isAuthenticated } = useAuthStore();
  const { owner, draft, initialize, update } = useResumeDraftStore();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [jobId, setJobId] = useState('');
  const currentOwner = isAuthenticated && user ? user.id : 'demo';
  useEffect(() => {
    setJobId(new URLSearchParams(window.location.search).get('job') ?? '');
    setNotice('');
    if (owner === currentOwner) return;
    initialize(currentOwner, user ? `${user.firstName} ${user.lastName}` : '', user?.email);
    if (currentOwner === 'demo') return;
    let alive = true;
    setBusy(true);
    Promise.allSettled([apiClient.get<Profile | { success: boolean; data: Profile }>('/api/users/profile'), apiClient.get<UserSkill[] | { success: boolean; data: UserSkill[] }>('/api/users/skills')]).then(results => {
      if (!alive || useResumeDraftStore.getState().owner !== currentOwner) return;
      const values: Partial<ResumeDraft> = {};
      if (results[0].status === 'fulfilled') { const profile = unwrap(results[0].value.data); values.title = profile.title ?? ''; values.summary = profile.bio ?? ''; }
      if (results[1].status === 'fulfilled') values.skills = unwrap(results[1].value.data).map(entry => entry.skill.name).join(', ');
      useResumeDraftStore.getState().update(values);
      setBusy(false);
    });
    return () => { alive = false; };
  }, [currentOwner, initialize]);
  async function tailor() {
    setNotice('');
    const target = demoJobs.find(job => job.id === jobId) ?? demoJobs[0];
    if (currentOwner === 'demo') { update({ title: target.title }); setNotice('عنوان هدف رزومه نمونه تنظیم شد.'); return; }
    if (!jobId || jobId.startsWith('demo-')) { setNotice('ابتدا یک فرصت واقعی را در بخش کشف فرصت‌ها انتخاب کنید.'); return; }
    const generationOwner = currentOwner;
    setBusy(true);
    try {
      const response = await apiClient.post<{ content: { summary?: string } } | { success: boolean; data: { content: { summary?: string } } }>('/api/resume/generate', { jobId });
      if (useResumeDraftStore.getState().owner !== generationOwner) return;
      const content = unwrap(response.data).content;
      if (typeof content.summary === 'string') update({ summary: content.summary });
      setNotice('خلاصه رزومه از سرویس رزومه دریافت شد.');
    } catch { if (useResumeDraftStore.getState().owner === generationOwner) setNotice('تولید رزومه انجام نشد. پروفایل و تنظیمات سرویس رزومه را بررسی کنید.'); }
    finally { if (useResumeDraftStore.getState().owner === generationOwner) setBusy(false); }
  }
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 dark:border-dark-border dark:bg-dark-card dark:text-slate-100';
  return <section className="animate-fade-in space-y-6">
    <div className="glass-card flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-light-surface p-4 dark:border-dark-border dark:bg-dark-surface md:flex-row md:items-center">
      <div><h1 className="text-base font-extrabold text-slate-800 dark:text-white">استودیو رزومه‌ساز استاندارد</h1><p className="text-xs text-slate-400">تنظیم رزومه فارسی بدون ادعای خلاف واقع با استانداردهای بین‌المللی ATS</p></div>
      <div className="flex flex-wrap items-center gap-2"><button onClick={tailor} disabled={busy} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-600"><Icon name="wand-magic-sparkles" /><span>{busy ? 'در حال پردازش…' : 'سفارشی‌سازی برای برترین شغل'}</span></button><button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:opacity-90 dark:bg-slate-200 dark:text-slate-900"><Icon name="print" /><span>چاپ / دانلود PDF</span></button></div>
    </div>
    {currentOwner === 'demo' && <DemoNotice>رزومه پرهام رضایی نمونه مرجع است. پس از ورود اطلاعات حساب شما بارگذاری می‌شود.</DemoNotice>}
    {notice && <p role="status" className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-3 text-xs text-brand-500">{notice}</p>}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="glass-card space-y-4 rounded-2xl border border-slate-200 bg-light-surface p-5 dark:border-dark-border dark:bg-dark-surface lg:col-span-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">ویرایش اطلاعات رزومه</h2>
        <div className="space-y-3 text-xs">
          <div><label htmlFor="res-name" className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">نام و نام خانوادگی</label><input id="res-name" value={draft.name} disabled={busy} onChange={event => update({ name: event.target.value })} className={inputClass} /></div>
          <div><label htmlFor="res-title" className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">عنوان شغلی</label><input id="res-title" value={draft.title} disabled={busy} onChange={event => update({ title: event.target.value })} className={inputClass} /></div>
          <div><label htmlFor="res-summary" className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">خلاصه حرفه‌ای</label><textarea id="res-summary" rows={3} value={draft.summary} disabled={busy} onChange={event => update({ summary: event.target.value })} className={inputClass} /></div>
          <div><label htmlFor="res-skills" className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">مهارت‌های اصلی (با ویرگول جدا کنید)</label><input id="res-skills" dir="auto" value={draft.skills} disabled={busy} onChange={event => update({ skills: event.target.value })} className={inputClass} /></div>
          {currentOwner !== 'demo' && <div><label htmlFor="res-projects" className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">سوابق / پروژه‌های ثبت‌شده توسط شما</label><textarea id="res-projects" rows={3} value={draft.projects} onChange={event => update({ projects: event.target.value })} className={inputClass} /></div>}
        </div>
      </div>
      <div id="resume-print-area" className="min-h-[600px] space-y-6 rounded-2xl border border-slate-200 bg-white p-8 text-xs text-slate-900 shadow-2xl lg:col-span-7">
        <div className="flex items-start justify-between gap-3 border-b-2 border-slate-800 pb-4"><div><h2 id="preview-name" className="text-2xl font-black text-slate-900">{draft.name || 'نام شما'}</h2><p id="preview-title" className="mt-1 text-xs font-bold text-slate-600">{draft.title || 'عنوان شغلی'}</p></div><div className="space-y-0.5 text-left text-[11px] text-slate-500"><p>ایمیل: {draft.email}</p>{currentOwner === 'demo' && <><p>تلفن: ۰۹۱۲۰۰۰۰۰۰۰</p><p>گیت‌هاپ: github.com/parham</p></>}</div></div>
        <div className="space-y-1"><h3 className="border-b border-slate-200 pb-1 text-xs font-extrabold uppercase tracking-wide text-slate-900">درباره من</h3><p id="preview-summary" className="whitespace-pre-wrap leading-relaxed text-slate-700">{draft.summary}</p></div>
        <div className="space-y-2"><h3 className="border-b border-slate-200 pb-1 text-xs font-extrabold uppercase tracking-wide text-slate-900">مهارت‌های فنی</h3><div id="preview-skills" className="flex flex-wrap gap-1.5">{[...new Set(draft.skills.split(/[,،]/).map(skill => skill.trim()).filter(Boolean))].map(skill => <span key={skill} className="rounded border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-800">{skill}</span>)}</div></div>
        <div className="space-y-3"><h3 className="border-b border-slate-200 pb-1 text-xs font-extrabold uppercase tracking-wide text-slate-900">سوابق / پروژه‌های برجسته</h3>{currentOwner === 'demo' ? <div className="space-y-2"><div className="flex justify-between font-bold text-slate-800"><span>{draft.projects.split('\n')[0]}</span><span className="font-normal text-slate-500">۱۴۰۲</span></div><p className="text-slate-600">{draft.projects.split('\n').slice(1).join('\n')}</p></div> : <p className="whitespace-pre-wrap text-slate-600">{draft.projects || 'هنوز سابقه یا پروژه‌ای ثبت نشده است.'}</p>}</div>
      </div>
    </div>
  </section>;
}
