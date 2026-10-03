'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useJobsStore } from '@/stores/useJobsStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MatchScore } from '@/components/matching/MatchScore';
import { SkillGapBadge, SkillMatchBadge } from '@/components/matching/SkillGapBadge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import apiClient from '@/lib/api-client';
import type { MatchResult, Job } from '@/types';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const { currentJob, fetchJob } = useJobsStore();
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingResume, setGeneratingResume] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchJob(id);
      if (isAuthenticated) {
        try {
          const res = await apiClient.post(`/api/matching/${id}`);
          setMatch(res.data.data);
        } catch {}
      }
      setLoading(false);
    }
    load();
  }, [id]); // eslint-disable-line

  async function generateResume() {
    setGeneratingResume(true);
    try {
      await apiClient.post('/api/resume/generate', { jobId: id });
      window.location.href = '/resume';
    } finally {
      setGeneratingResume(false);
    }
  }

  if (loading || !currentJob) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48" /><Skeleton className="h-40 w-full" /></div>;
  }

  const job = currentJob as Job;
  const skills = (job.requiredSkills as { name: string }[]).map((s) => s.name);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
        <p className="text-sm text-gray-500">{job.company} · {job.location} · {job.experienceLevel}</p>
      </div>

      {match && <MatchScore result={match} />}

      <Card>
        <h2 className="mb-2 font-semibold text-gray-900">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-gray-700">{job.description}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-gray-900">Required Skills</h2>
          <div className="flex flex-wrap gap-1">
            {skills.map((s) => <SkillMatchBadge key={s} skill={s} />)}
          </div>
        </Card>
        {((job.preferredSkills as { name: string }[] | undefined) ?? []).length > 0 && (
          <Card>
            <h2 className="mb-3 font-semibold text-gray-900">Preferred Skills</h2>
            <div className="flex flex-wrap gap-1">
              {((job.preferredSkills as { name: string }[]) ?? []).map((s) => (
                <Badge key={s.name}>{s.name}</Badge>
              ))}
            </div>
          </Card>
        )}
      </div>

      {match?.skillGaps && match.skillGaps.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold text-gray-900">Skill Gaps</h2>
          <div className="flex flex-wrap gap-1">
            {match.skillGaps.map((g) => <SkillGapBadge key={g} skill={g} />)}
          </div>
        </Card>
      )}

      {isAuthenticated && (
        <Button onClick={generateResume} disabled={generatingResume}>
          {generatingResume ? 'Generating…' : 'Generate Tailored Resume →'}
        </Button>
      )}
    </div>
  );
}
