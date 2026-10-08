import { JobSearchIntent } from "../../chat/domain/conversation";
import {
  DiscoveredJob,
  DiscoveryJob,
  DiscoveryResult,
  SourceReport,
} from "../domain/discovery";

export type CandidateStatus =
  "DISCOVERED" | "REJECTED" | "FAILED" | "TIMED_OUT" | "MATCHED";
export interface CandidateLifecycleEvent {
  source: string;
  url: string;
  status: CandidateStatus;
  errorCode?: string;
  stage?: string;
}
export interface DiscoveryProgress {
  // Internal snapshots only; never publish these as public source events.
  sourceObserved?(report: SourceReport): void;
  sourceProgress?(
    source: string,
    stage: "fetch" | "extract" | "filter",
  ): Promise<void>;
  sourceStarted(source: string): Promise<void>;
  sourceCompleted(report: SourceReport): Promise<void>;
  jobCandidate(job: DiscoveredJob): Promise<boolean>;
  // Fire-and-forget: never awaited by callers, so a slow/failing implementation
  // cannot change discovery's timing or outcome.
  candidateObserved?(event: CandidateLifecycleEvent): void;
}

export const MAX_SOURCE_FETCHES = 10;
export interface SourceDiscoveryBudget {
  remainingFetches: number;
  seenUrls: Set<string>;
  pendingUrls?: string[];
  query?: string;
  searchedLimit?: number;
  searchExhausted?: boolean;
}
export interface DiscoveryOptions {
  sources: string[];
  queryTitles?: string[];
  budgets?: Map<string, SourceDiscoveryBudget>;
  fetchCeiling?: number;
  maxResults?: number;
}

export abstract class JobDiscoveryProvider {
  abstract discover(
    intent: JobSearchIntent,
    signal: AbortSignal,
    progress?: DiscoveryProgress,
    options?: DiscoveryOptions,
  ): Promise<{ jobs: DiscoveredJob[]; sources: SourceReport[] }>;
}
export abstract class JobContentExtractor {
  abstract extract(
    content: string,
    url: string,
    signal: AbortSignal,
  ): Promise<DiscoveredJob | null>;
}
export interface DiscoveryRun {
  id: string;
  status: string;
  jobs: DiscoveryResult["jobs"];
  sources: SourceReport[];
  cached: boolean;
}
export interface CandidateRecord extends CandidateLifecycleEvent {
  runId: string;
  discoveredAt: string;
  lastAttemptAt: string;
  retryCount: number;
}
export interface CandidateListOptions {
  status?: CandidateStatus;
  cursor?: string;
  limit?: number;
}
export interface CandidateListResult {
  candidates: CandidateRecord[];
  nextCursor?: string;
}
export abstract class DiscoveryRepository {
  // Only the live path uses incremental persistence; legacy implementations stay compatible.
  saveCandidate(_job: DiscoveredJob): Promise<DiscoveryJob> {
    throw new Error("Incremental persistence not implemented");
  }
  // Best-effort diagnostic data: a repository that doesn't implement this
  // simply records nothing, rather than failing the caller.
  recordCandidate(
    _runId: string,
    _event: CandidateLifecycleEvent,
  ): Promise<void> {
    return Promise.resolve();
  }
  listCandidates(
    _userId: string,
    _runId: string,
    _options?: CandidateListOptions,
  ): Promise<CandidateListResult> {
    throw new Error("Candidate listing not implemented");
  }
  abstract context(
    userId: string,
    conversationId: string,
  ): Promise<{
    intent: JobSearchIntent;
    version: number;
    rankingExperienceLevel?: string;
  }>;
  abstract begin(
    userId: string,
    conversationId: string,
    version: number,
    intent: JobSearchIntent,
  ): Promise<DiscoveryRun>;
  abstract complete(
    runId: string,
    jobs: DiscoveredJob[],
    sources: SourceReport[],
    partial: boolean,
  ): Promise<DiscoveryResult>;
  abstract fail(
    runId: string,
    code: string,
    sources?: SourceReport[],
  ): Promise<void>;
  abstract latest(
    userId: string,
    conversationId: string,
  ): Promise<DiscoveryResult | null>;
}
