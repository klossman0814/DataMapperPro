import { create } from 'zustand';
import type { ProcessingJob } from '../types';

interface JobState {
  jobs: ProcessingJob[];
  currentJob: ProcessingJob | null;
  setJobs: (jobs: ProcessingJob[]) => void;
  addJob: (job: ProcessingJob) => void;
  updateJob: (id: string, updates: Partial<ProcessingJob>) => void;
  setCurrentJob: (job: ProcessingJob | null) => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  currentJob: null,

  setJobs: (jobs) => set({ jobs }),

  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),

  updateJob: (id, updates) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
      currentJob:
        state.currentJob?.id === id
          ? { ...state.currentJob, ...updates }
          : state.currentJob,
    })),

  setCurrentJob: (job) => set({ currentJob: job }),
}));
