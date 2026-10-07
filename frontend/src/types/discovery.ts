export interface DiscoveryIssue {
  category: "site" | "provider" | "extraction" | "timeout" | "unknown";
  message: string;
  retryable: boolean;
  stage?: "search" | "fetch" | "extract" | "filter" | "validate";
}
export interface DiscoveryJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workType: "Remote" | "Hybrid" | "OnSite" | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: "TOMAN" | null;
  salaryPeriod: "MONTHLY" | null;
  source: string;
  sourceUrl: string;
  requiredSkills: string[];
  preferredSkills: string[];
  warnings: string[];
}
export interface DiscoveryResult {
  runId: string;
  jobs: DiscoveryJob[];
  partial: boolean;
  cached?: boolean;
  code?: "NO_JOBS_FOUND";
  sources: Array<{
    source: string;
    found: number;
    accepted: number;
    rejected: number;
    error?: string;
    issue?: DiscoveryIssue;
  }>;
}
