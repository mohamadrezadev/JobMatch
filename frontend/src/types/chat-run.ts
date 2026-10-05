import type { DiscoveryJob, DiscoveryResult } from "./discovery";

export interface RunEvent {
  id: string;
  runId: string;
  sequence: number;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}
export interface ChatRunView {
  runId: string;
  conversationId: string | null;
  userMessageId: string | null;
  assistantMessageId: string | null;
  message: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED";
  events: RunEvent[];
  sequence: number;
  jobs: DiscoveryJob[];
  sources: DiscoveryResult["sources"];
  retryable: boolean;
  error: string | null;
}
export const runFinished = (status: string) =>
  ["COMPLETED", "PARTIAL", "FAILED"].includes(status);
