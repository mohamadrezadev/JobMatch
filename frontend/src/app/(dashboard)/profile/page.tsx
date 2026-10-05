'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import apiClient from '@/lib/api-client';

type ExperienceLevel = 'Junior' | 'Mid' | 'Senior';
type WorkType = 'Remote' | 'OnSite' | 'Hybrid';

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    title: '',
    bio: '',
    location: '',
    desiredSalary: '',
    experienceYears: '',
    experienceLevel: '' as ExperienceLevel | '',
    workType: '' as WorkType | '',
  });

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    try {
      const res = await apiClient.get('/api/users/profile');
      const p = res.data.data ?? res.data;
      setForm({
        title: p.title ?? '',
        bio: p.bio ?? '',
        location: p.location ?? '',
        desiredSalary: p.desiredSalary?.toString() ?? '',
        experienceYears: p.experienceYears?.toString() ?? '',
        experienceLevel: (p.experienceLevel ?? '') as ExperienceLevel,
        workType: (p.workType ?? '') as WorkType,
      });
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.put('/api/users/profile', {
        ...form,
        experienceLevel: form.experienceLevel || undefined,
        workType: form.workType || undefined,
        desiredSalary: form.desiredSalary ? Number(form.desiredSalary) : undefined,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Error handled by api-client interceptor
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">پروفایل</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="نقش شغلی / Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="مکان" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="سال‌های سابقه" type="number" min="0" max="50" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">سطح تجربه</label>
              <select value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value as ExperienceLevel })}
                className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none">
                <option value="">انتخاب کنید…</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="حقوق ماهانه موردنظر" type="number" value={form.desiredSalary} onChange={(e) => setForm({ ...form, desiredSalary: e.target.value })} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">نوع همکاری</label>
              <select value={form.workType} onChange={(e) => setForm({ ...form, workType: e.target.value as WorkType })}
                className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none">
                <option value="">انتخاب کنید…</option>
                <option value="Remote">Remote</option>
                <option value="OnSite">On-site</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">درباره من</label>
            <textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
              placeholder="درباره خودتان برای کارفرما بنویسید…" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'در حال ذخیره…' : saved ? 'ذخیره شد' : 'ذخیره پروفایل'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
