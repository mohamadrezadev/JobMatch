'use client';

import { useEffect, useState } from 'react';
import { useJobsStore } from '@/stores/useJobsStore';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilters } from '@/components/jobs/JobFilters';
import { Skeleton } from '@/components/ui/Skeleton';

export default function JobsPage() {
  const { jobs, total, page, isLoading, searchKeyword, setPage, setSearchKeyword, fetchJobs } = useJobsStore();
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    fetchJobs(page, searchKeyword || keyword || undefined);
  }, [page]); // eslint-disable-line

  function handleSearch(kw: string) {
    setKeyword(kw);
    setPage(1);
    fetchJobs(1, kw);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
      <JobFilters keyword={keyword} onSearch={handleSearch} onClear={() => { setKeyword(''); setPage(1); fetchJobs(1); }} />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
          {total > 12 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="rounded border px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
              >Previous</button>
              <span className="text-sm text-gray-500">Page {page}</span>
              <button disabled={page * 12 >= total} onClick={() => setPage(p => p + 1)}
                className="rounded border px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
              >Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
