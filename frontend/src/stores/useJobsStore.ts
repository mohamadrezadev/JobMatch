import { create } from 'zustand';
import apiClient from '@/lib/api-client';
import type { Job } from '@/types/job';

interface JobsState {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  currentJob: Job | null;
  searchKeyword: string;
  setPage: (page: number | ((p: number) => number)) => void;
  setSearchKeyword: (keyword: string) => void;
  fetchJobs: (page?: number, keyword?: string) => Promise<void>;
  fetchJob: (id: string) => Promise<void>;
  fetchRecommended: () => Promise<void>;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  total: 0,
  page: 1,
  limit: 12,
  isLoading: false,
  currentJob: null,
  searchKeyword: '',

  setPage: (page) => set({ page: typeof page === 'function' ? page(get().page) : page }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword, page: 1 }),

  fetchJobs: async (page = 1, keyword?) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (keyword) params.set('keyword', keyword);
      const res = await apiClient.get(`/api/jobs/search?${params}`);
      const { items: jobs, total } = res.data.data;
      set({ jobs, total, page, searchKeyword: keyword ?? '', isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchJob: async (id) => {
    const res = await apiClient.get(`/api/jobs/${id}`);
    set({ currentJob: res.data.data });
  },

  fetchRecommended: async () => {
    const res = await apiClient.get('/api/jobs/recommended');
    set({ jobs: res.data.data, isLoading: false });
  },
}));
