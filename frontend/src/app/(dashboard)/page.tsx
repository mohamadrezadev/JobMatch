'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useJobsStore } from '@/stores/useJobsStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { JobCard } from '@/components/jobs/JobCard';
import Link from 'next/link';

export default function DashboardPage() {
  const { isProfileComplete, isAuthenticated } = useAuthStore();
  const { fetchRecommended, jobs } = useJobsStore();

  useEffect(() => {
    if (isAuthenticated) fetchRecommended();
  }, []); // eslint-disable-line

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {!isProfileComplete && (
        <Card className="border-brand-200 bg-brand-50">
          <p className="mb-3 text-sm text-brand-800">
            Complete your profile to get personalized job recommendations.
          </p>
          <Link href="/onboarding"><Button size="sm">Complete Onboarding</Button></Link>
        </Card>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recommended for you</h2>
          <Link href="/jobs" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>
        {jobs.length === 0 ? (
          <Card><p className="text-sm text-gray-500">No jobs found. Complete your profile to see matches.</p></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </section>
    </div>
  );
}
