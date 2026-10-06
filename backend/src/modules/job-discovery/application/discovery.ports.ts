import { JobSearchIntent } from "../../chat/domain/conversation";
import {
  DiscoveredJob,
  DiscoveryJob,
  DiscoveryResult,
  SourceReport,
} from "../domain/discovery";

export interface DiscoveryProgress {
  sourceStarted(source: string): Promise<void>;
  sourceCompleted(report: SourceReport): Promise<void>;
  jobCandidate(job: DiscoveredJob): Promise<boolean>;
}

export abstract class JobDiscoveryProvider {
  abstract discover(
    intent: JobSearchIntent,
    signal: AbortSignal,
    progress?: DiscoveryProgress,
    options?: { sources: string[] },
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
export abstract class DiscoveryRepository {
  // Only the live path uses incremental persistence; legacy implementations stay compatible.
  saveCandidate(_job: DiscoveredJob): Promise<DiscoveryJob> {
    throw new Error("Incremental persistence not implemented");
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
