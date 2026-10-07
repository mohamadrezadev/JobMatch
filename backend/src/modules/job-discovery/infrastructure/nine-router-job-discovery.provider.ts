import { JobSearchIntent } from "../../chat/domain/conversation";
import { Logger } from "@nestjs/common";
import axios from "axios";
import { APIConnectionTimeoutError, APIError } from "openai";
import {
  JobDiscoveryProvider,
  JobContentExtractor,
  DiscoveryProgress,
  DiscoveryOptions,
  MAX_SOURCE_FETCHES,
} from "../application/discovery.ports";
import { JobPageDecisionProvider } from "../application/job-page-decision.port";
import {
  DiscoveredJob,
  SourceReport,
  queryFor,
  canonicalUrl,
  DiscoveryError,
  normalizeText,
} from "../domain/discovery";
import {
  normalizeJob,
  explicitlyClosed,
  pageFailureCode,
} from "../domain/job-normalizer";
import { NineRouterClient } from "./nine-router.client";
import { SourceValidator } from "./source-validator";
import { emptySourceMetrics } from "../domain/adaptive-discovery";

export class NineRouterJobDiscoveryProvider extends JobDiscoveryProvider {
  private readonly logger = new Logger(NineRouterJobDiscoveryProvider.name);
  private failure(
    report: SourceReport,
    error: unknown,
    stage: string,
    started: number,
    signal: AbortSignal,
    url?: string,
  ) {
    const transport = axios.isAxiosError(error) ? error : undefined;
    const detail = error as {
      attempts?: number;
      upstreamStatus?: number;
    } | null;
    const code = signal.aborted
      ? "TIMEOUT"
      : error instanceof DiscoveryError
        ? error.code
        : stage === "search"
          ? "SEARCH_FAILED"
          : error instanceof APIConnectionTimeoutError
            ? "EXTRACTION_TIMEOUT"
            : stage === "extract" && error instanceof APIError && error.status
              ? `EXTRACTION_HTTP_${error.status}`
              : stage === "extract"
                ? "EXTRACTION_FAILED"
                : "FETCH_OR_VALIDATION_FAILED";
    report.error = code;
    if (report.metrics && /TIMEOUT/.test(code)) report.metrics.timeouts++;
    let page: string | undefined;
    if (url) {
      try {
        const target = new URL(url);
        page =
          target.hostname === "vertexaisearch.cloud.google.com"
            ? target.origin + "/grounding-api-redirect/[redacted]"
            : target.origin + target.pathname;
      } catch {
        /* No untrusted text in logs. */
      }
    }
    this.logger.warn(
      JSON.stringify({
        source: report.source,
        stage,
        code,
        page,
        durationMs: Date.now() - started,
        attempts: detail?.attempts,
        httpStatus:
          detail?.upstreamStatus ??
          transport?.response?.status ??
          (error instanceof APIError ? error.status : undefined),
      }),
    );
  }
  constructor(
    private readonly client: NineRouterClient,
    private readonly validator: SourceValidator,
    private readonly sources: string[],
    private readonly extractor?: JobContentExtractor,
    private readonly decisionProvider?: JobPageDecisionProvider,
  ) {
    super();
  }
  async discover(
    intent: JobSearchIntent,
    signal: AbortSignal,
    progress?: DiscoveryProgress,
    options?: DiscoveryOptions,
  ) {
    const selected = options?.sources ?? this.sources.slice(0, 4);
    if (
      !selected.length ||
      new Set(selected).size !== selected.length ||
      selected.some((source) => !this.sources.includes(source))
    )
      throw new DiscoveryError("SOURCE_REJECTED", 400);
    await this.client.ready(signal);
    const jobs: DiscoveredJob[] = [],
      reports: SourceReport[] = [];
    await Promise.all(
      selected.map(async (source) => {
        const budget = options?.budgets?.get(source) ?? {
          remainingFetches: MAX_SOURCE_FETCHES,
          seenUrls: new Set<string>(),
        };
        const query = queryFor(source, intent, options?.queryTitles),
          metrics = emptySourceMetrics(),
          report: SourceReport = {
            source,
            query,
            found: 0,
            accepted: 0,
            rejected: 0,
            metrics,
          };
        const observed = () => progress?.sourceObserved?.(report);
        const timed = async <T>(
          key: "searchMs" | "validationMs" | "fetchMs" | "aiMs" | "v1mMs",
          operation: () => Promise<T>,
        ) => {
          const started = Date.now();
          try {
            return await operation();
          } finally {
            metrics[key] += Date.now() - started;
            observed();
          }
        };
        const ceiling = Math.max(
          1,
          Math.min(
            MAX_SOURCE_FETCHES,
            Math.floor(options?.fetchCeiling ?? MAX_SOURCE_FETCHES),
          ),
        );
        const canFetch = () =>
          budget.remainingFetches > 0 &&
          MAX_SOURCE_FETCHES - budget.remainingFetches < ceiling;
        reports.push(report);
        const stages = new Set<string>();
        const phase = async (stage: "fetch" | "extract" | "filter") => {
          if (!stages.has(stage) && !signal.aborted) {
            stages.add(stage);
            await progress?.sourceProgress?.(source, stage);
          }
        };
        await progress?.sourceStarted(source);
        if (!canFetch() || signal.aborted) {
          if (signal.aborted) report.error = "TIMEOUT";
          await progress?.sourceCompleted({ ...report });
          return;
        }
        const searchStarted = Date.now();
        try {
          const queue = budget.pendingUrls ?? (budget.pendingUrls = []),
            seen = budget.seenUrls;
          const maxResults = Math.max(
            1,
            Math.min(10, Math.floor(options?.maxResults ?? 10)),
          );
          if (budget.query !== query) {
            budget.query = query;
            budget.searchedLimit = 0;
            budget.searchExhausted = false;
          }
          if (
            (budget.searchedLimit ?? 0) < maxResults &&
            !budget.searchExhausted &&
            queue.length <
              ceiling - (MAX_SOURCE_FETCHES - budget.remainingFetches)
          ) {
            metrics.searchCalls++;
            observed();
            const urls = [
              ...new Set(
                await timed("searchMs", () =>
                  this.client.search(query, source, signal, maxResults),
                ),
              ),
            ].slice(0, maxResults);
            budget.searchedLimit = maxResults;
            budget.searchExhausted = urls.length < maxResults;
            report.found = urls.length;
            queue.push(...urls.filter((url) => !queue.includes(url)));
            observed();
          }
          let fetches = 0;
          while (queue.length && canFetch()) {
            if (signal.aborted) {
              report.error = "TIMEOUT";
              break;
            }
            // Open one listing first, then fetch detail pages in bounded batches.
            // This preserves the ten-page budget without spending it on listings.
            const batchSize =
              fetches === 0 && !queue.some(jobDetailUrl) ? 1 : 3;
            const batch = queue.splice(
              0,
              Math.min(
                batchSize,
                budget.remainingFetches,
                ceiling - (MAX_SOURCE_FETCHES - budget.remainingFetches),
              ),
            );
            await Promise.all(
              batch.map(async (url) => {
                let stage = "validate";
                let diagnosticUrl = url;
                const started = Date.now();
                if (signal.aborted) return;
                if (!this.validator.searchCandidate(url)) {
                  report.rejected++;
                  return;
                }
                const identity = canonicalUrl(url);
                if (seen.has(identity)) {
                  metrics.duplicates++;
                  observed();
                  return;
                }
                seen.add(identity);
                try {
                  let resolved: string;
                  try {
                    resolved = await timed("validationMs", () =>
                      this.validator.resolveSearch(url, signal),
                    );
                  } catch (error) {
                    // A verified remote provider can resolve a public Google bridge
                    // which rejects direct requests, but must return final_url.
                    if (
                      error instanceof DiscoveryError &&
                      ((error.code === "SEARCH_LINK_UNRESOLVED" &&
                        this.validator.grounding(url)) ||
                        (error.code === "SOURCE_UNAVAILABLE" &&
                          this.validator.allowed(url)))
                    )
                      resolved = url;
                    else throw error;
                  }
                  if (signal.aborted) return;
                  const resolvedIdentity = canonicalUrl(resolved);
                  if (
                    resolvedIdentity !== identity &&
                    seen.has(resolvedIdentity)
                  )
                    return;
                  seen.add(resolvedIdentity);
                  if (!canFetch()) return;
                  budget.remainingFetches--;
                  fetches++;
                  stage = "fetch";
                  await phase("fetch");
                  if (signal.aborted) {
                    budget.remainingFetches++;
                    return;
                  }
                  metrics.urlsFetched++;
                  observed();
                  const page = await timed("fetchMs", () =>
                    this.client.fetch(resolved, signal),
                  );
                  if (signal.aborted) return;
                  if (
                    this.validator.grounding(resolved) &&
                    !page.finalUrlVerified
                  )
                    throw new DiscoveryError("FETCH_PROVENANCE_MISSING", 502);
                  if (!this.validator.allowed(page.url)) {
                    report.rejected++;
                    return;
                  }
                  stage = "validate";
                  await timed("validationMs", () =>
                    this.validator.validate(page.url, signal),
                  );
                  const finalIdentity = canonicalUrl(page.url);
                  if (
                    finalIdentity !== resolvedIdentity &&
                    seen.has(finalIdentity)
                  )
                    return;
                  seen.add(finalIdentity);
                  diagnosticUrl = page.url;
                  stage = "page";
                  const pageError = pageFailureCode(page.content);
                  if (pageError) throw new DiscoveryError(pageError, 502);
                  if (!jobDetailUrl(page.url)) {
                    const details: string[] = [];
                    for (const link of page.links ?? []) {
                      let target: string;
                      try {
                        target = canonicalUrl(
                          new URL(link, page.url).toString(),
                        );
                      } catch {
                        continue;
                      }
                      if (
                        this.validator.allowed(target) &&
                        jobDetailUrl(target) &&
                        !seen.has(target) &&
                        !details.includes(target)
                      ) {
                        details.push(target);
                        report.found++;
                      }
                    }
                    // Search can fill all ten slots with listing/grounding links.
                    // Prefer discovered details so those listings cannot consume the
                    // whole budget without ever visiting an advertised position.
                    const terms = intent.targetRoles
                      .flatMap((role) =>
                        normalizeText(role)
                          .replace(/developer/g, "")
                          .replace(/حسابداری/g, "حسابدار accountant accounting")
                          .split(/[\s.]+/),
                      )
                      .filter((term) => term.length > 2);
                    const relevance = (target: string) => {
                      let text = target;
                      try {
                        text = decodeURIComponent(new URL(target).pathname);
                      } catch {
                        /* Use original text. */
                      }
                      return terms.filter((term) =>
                        normalizeText(text).includes(term),
                      ).length;
                    };
                    details.sort((a, b) => relevance(b) - relevance(a));
                    const remaining = budget.remainingFetches;
                    queue.splice(
                      0,
                      queue.length,
                      ...[...new Set([...details, ...queue])].slice(
                        0,
                        Math.max(0, remaining),
                      ),
                    );
                    report.rejected++;
                    return;
                  }
                  if (explicitlyClosed(page.content)) {
                    report.rejected++;
                    return;
                  }
                  stage = "extract";
                  await phase("extract");
                  if (signal.aborted) return;
                  const parseStarted = Date.now();
                  let job = normalizeJob(page.content, canonicalUrl(page.url));
                  metrics.parseMs += Date.now() - parseStarted;
                  if (!job && this.extractor && !signal.aborted) {
                    let shouldExtract = true;
                    if (this.decisionProvider) {
                      metrics.v1mCalls++;
                      metrics.v1mPrimaryCalls++;
                      observed();
                      const decision = await timed("v1mMs", () =>
                        this.decisionProvider!.evaluate(
                          page.content,
                          canonicalUrl(page.url),
                          signal,
                        ),
                      );
                      shouldExtract = decision.shouldExtract;
                      if (decision.mode === "v1m-primary")
                        metrics.v1mPrimarySuccess++;
                      else if (decision.mode === "v1m-fallback") {
                        metrics.v1mPrimaryFailures++;
                        metrics.v1mFallbackCalls++;
                        metrics.v1mFallbackSuccess++;
                      } else {
                        metrics.v1mPrimaryFailures++;
                        metrics.v1mFallbackCalls++;
                        metrics.v1mFallbackFailures++;
                        metrics.v1mFailOpen++;
                      }
                      if (shouldExtract) metrics.v1mAccepted++;
                      else {
                        metrics.v1mRejected++;
                        metrics.aiCallsSaved++;
                      }
                      observed();
                    }
                    if (!shouldExtract) {
                      report.rejected++;
                      return;
                    }
                    metrics.aiCalls++;
                    observed();
                    job = await timed("aiMs", () =>
                      this.extractor!.extract(
                        page.content,
                        canonicalUrl(page.url),
                        signal,
                      ),
                    );
                  }
                  if (!job) {
                    throw new DiscoveryError("EXTRACTION_NO_POSTING", 502);
                  }
                  if (signal.aborted) return;
                  await phase("filter");
                  if (signal.aborted) return;
                  jobs.push(job);
                  metrics.jobsExtracted++;
                  report.evaluated = (report.evaluated ?? 0) + 1;
                  observed();
                  if (!progress || (await progress.jobCandidate(job)))
                    report.accepted++;
                  else report.rejected++;
                  observed();
                } catch (error) {
                  if (signal.aborted) return;
                  report.rejected++;
                  this.failure(
                    report,
                    error,
                    stage,
                    started,
                    signal,
                    diagnosticUrl,
                  );
                  observed();
                }
              }),
            );
          }
        } catch (error) {
          if (!signal.aborted)
            this.failure(report, error, "search", searchStarted, signal);
        }
        await progress?.sourceCompleted({ ...report });
      }),
    );
    return {
      jobs,
      sources: reports.sort(
        (a, b) =>
          this.sources.indexOf(a.source) - this.sources.indexOf(b.source),
      ),
    };
  }
}
export function jobDetailUrl(value: string) {
  try {
    const url = new URL(value);
    if (/(?:^|\.)irantalent\.com$/.test(url.hostname))
      return /^\/(?:en\/)?job\/[^/]+\/\d+\/?$/.test(url.pathname);
    return (
      /\/jobs?\/[^/]+/i.test(url.pathname) ||
      (url.hostname.endsWith("e-estekhdam.com") &&
        url.pathname.split("/").filter(Boolean).length > 0 &&
        !/^\/(?:jobs|category|tag|search)(?:\/|$)/i.test(url.pathname))
    );
  } catch {
    return false;
  }
}
