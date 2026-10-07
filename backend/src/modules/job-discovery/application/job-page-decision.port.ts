export interface JobPageDecision {
  isJobPosting: number;
  isClosed: number;
  isSpam: number;
  shouldExtract: boolean;
  model?: string;
  mode: "v1m-primary" | "v1m-fallback" | "fail-open";
}

export abstract class JobPageDecisionProvider {
  abstract evaluate(
    content: string,
    url: string,
    signal: AbortSignal,
  ): Promise<JobPageDecision>;
}
