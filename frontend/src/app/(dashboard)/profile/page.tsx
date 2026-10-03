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
      const p = res.data.data;
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
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Target Role / Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Years of Experience" type="number" min="0" max="50" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Experience Level</label>
              <select value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value as ExperienceLevel })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none">
                <option value="">Select…</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Desired Salary (monthly)" type="number" value={form.desiredSalary} onChange={(e) => setForm({ ...form, desiredSalary: e.target.value })} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Work Type</label>
              <select value={form.workType} onChange={(e) => setForm({ ...form, workType: e.target.value as WorkType })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none">
                <option value="">Select…</option>
                <option value="Remote">Remote</option>
                <option value="OnSite">On-site</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
            <textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
              placeholder="Tell employers about yourself…" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : saved ? 'Saved!' : 'Save Profile'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
