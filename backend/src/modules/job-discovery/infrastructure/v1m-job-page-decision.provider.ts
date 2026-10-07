import axios, { AxiosInstance } from "axios";
import { Logger } from "@nestjs/common";
import {
  JobPageDecision,
  JobPageDecisionProvider,
} from "../application/job-page-decision.port";
import { plainText } from "../domain/job-normalizer";

export interface V1mConfig {
  baseUrl: string;
  apiKey?: string;
  models: string[];
  timeoutMs: number;
  jobThreshold: number;
  closedThreshold: number;
  spamThreshold: number;
  maxContentChars: number;
}

interface NoulAnswer {
  isJobPosting: number;
  isClosed: number;
  isSpam: number;
}

const QUESTIONS = {
  is_job_posting: {
    type: "noul",
    instructions: "Is this page primarily a genuine individual job vacancy?",
  },
  is_closed: {
    type: "noul",
    instructions:
      "Does this page indicate that the vacancy is closed, expired, filled, or no longer accepting applications?",
  },
  is_spam: {
    type: "noul",
    instructions: "Is this page spam, misleading, irrelevant, or not a genuine vacancy?",
  },
};

function noul(value: unknown): number | null {
  return value &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "noul" &&
    typeof (value as { noul?: unknown }).noul === "number" &&
    (value as { noul: number }).noul >= 0 &&
    (value as { noul: number }).noul <= 1
    ? (value as { noul: number }).noul
    : null;
}

function parseAnswers(data: unknown): NoulAnswer | null {
  const answers = (data as { answers?: unknown })?.answers;
  if (!answers || typeof answers !== "object") return null;
  const isJobPosting = noul((answers as Record<string, unknown>).is_job_posting);
  const isClosed = noul((answers as Record<string, unknown>).is_closed);
  const isSpam = noul((answers as Record<string, unknown>).is_spam);
  if (isJobPosting === null || isClosed === null || isSpam === null)
    return null;
  return { isJobPosting, isClosed, isSpam };
}

export class V1mJobPageDecisionProvider extends JobPageDecisionProvider {
  private readonly logger = new Logger(V1mJobPageDecisionProvider.name);
  private readonly http: AxiosInstance;
  constructor(private readonly config: V1mConfig) {
    super();
    this.http = axios.create({
      baseURL: config.baseUrl.replace(/\/+$/, ""),
      headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
    });
  }
  private failOpen(): JobPageDecision {
    return {
      isJobPosting: 1,
      isClosed: 0,
      isSpam: 0,
      shouldExtract: true,
      mode: "fail-open",
    };
  }
  async evaluate(
    content: string,
    url: string,
    signal: AbortSignal,
  ): Promise<JobPageDecision> {
    const text = plainText(content)?.slice(0, this.config.maxContentChars);
    if (!text) return this.failOpen();
    for (const [index, model] of this.config.models.entries()) {
      if (signal.aborted) break;
      const started = Date.now();
      try {
        const response = await this.http.post(
          "/v1/systemone",
          { model, state: { url, content: text }, questions: QUESTIONS },
          {
            signal,
            timeout: Math.max(100, this.config.timeoutMs),
          },
        );
        const answer = parseAnswers(response.data);
        if (!answer) {
          this.logger.warn(
            JSON.stringify({
              model,
              durationMs: Date.now() - started,
              success: false,
              reason: "invalid-response",
            }),
          );
          continue;
        }
        const shouldExtract =
          answer.isJobPosting >= this.config.jobThreshold &&
          answer.isClosed < this.config.closedThreshold &&
          answer.isSpam < this.config.spamThreshold;
        const mode = index === 0 ? "v1m-primary" : "v1m-fallback";
        this.logger.log(
          JSON.stringify({
            model,
            durationMs: Date.now() - started,
            success: true,
            shouldExtract,
            isJobPosting: answer.isJobPosting,
            isClosed: answer.isClosed,
            isSpam: answer.isSpam,
            fallbackUsed: index > 0,
          }),
        );
        return {
          isJobPosting: answer.isJobPosting,
          isClosed: answer.isClosed,
          isSpam: answer.isSpam,
          shouldExtract,
          model,
          mode,
        };
      } catch (error) {
        if (signal.aborted) break;
        this.logger.warn(
          JSON.stringify({
            model,
            durationMs: Date.now() - started,
            success: false,
            reason: axios.isAxiosError(error)
              ? (error.code ?? error.response?.status ?? "request-failed")
              : "request-failed",
          }),
        );
        continue;
      }
    }
    return this.failOpen();
  }
}
