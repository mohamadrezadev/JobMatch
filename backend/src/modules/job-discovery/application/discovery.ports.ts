import { JobSearchIntent } from "../../chat/domain/conversation";
import {
  DiscoveredJob,
  DiscoveryResult,
  SourceReport,
} from "../domain/discovery";

export abstract class JobDiscoveryProvider {
  abstract discover(
    intent: JobSearchIntent,
    signal: AbortSignal,
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
  abstract context(
    userId: string,
    conversationId: string,
  ): Promise<{ intent: JobSearchIntent; version: number }>;
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
