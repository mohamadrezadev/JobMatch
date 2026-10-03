'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useJobsStore } from '@/stores/useJobsStore';
import { ResumePreview } from '@/components/resume/ResumePreview';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import apiClient from '@/lib/api-client';

export default function ResumePage() {
  const { jobs, fetchRecommended } = useJobsStore();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecommended();
  }, []); // eslint-disable-line

  async function loadResume(jobId: string) {
    setSelectedJobId(jobId);
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/resume/${jobId}`);
      setResumeData(res.data.data);
    } catch {
      // Resume may not exist yet — user can generate it from job detail
      setResumeData(null);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf(jobId: string) {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/resume/${jobId}/pdf`, '_blank');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Resume</h1>

      <Card>
        <h2 className="mb-3 font-semibold text-gray-900">Select a job to preview resume</h2>
        <div className="space-y-2">
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-500">No jobs yet. Browse jobs first and generate a resume from the job detail page.</p>
          ) : (
            jobs.map((j) => (
              <button key={j.id} onClick={() => loadResume(j.id)}
                className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${selectedJobId === j.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="font-medium text-gray-900">{j.title}</div>
                <div className="text-xs text-gray-500">{j.company} · {j.location}</div>
              </button>
            ))
          )}
        </div>
      </Card>

      {loading && <Skeleton className="h-64 w-full" />}
      {resumeData && !loading && (
        <ResumePreview content={resumeData.content} jobId={resumeData.jobId} onDownloadPdf={downloadPdf} />
      )}
      {selectedJobId && !loading && !resumeData && (
        <Card>
          <p className="mb-3 text-sm text-gray-600">No resume generated for this job yet.</p>
          <Button onClick={() => window.location.href = `/jobs/${selectedJobId}`}>Go to Job Detail</Button>
        </Card>
      )}
    </div>
  );
}
