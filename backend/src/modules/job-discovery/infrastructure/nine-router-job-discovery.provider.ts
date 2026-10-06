import { JobSearchIntent } from "../../chat/domain/conversation";
import {
  JobDiscoveryProvider,
  JobContentExtractor,
  DiscoveryProgress,
  DiscoveryOptions,
  MAX_SOURCE_FETCHES,
} from "../application/discovery.ports";
import {
  DiscoveredJob,
  SourceReport,
  queryFor,
  canonicalUrl,
  DiscoveryError,
  normalizeText,
} from "../domain/discovery";
import { normalizeJob, explicitlyClosed } from "../domain/job-normalizer";
import { NineRouterClient } from "./nine-router.client";
import { SourceValidator } from "./source-validator";

export class NineRouterJobDiscoveryProvider extends JobDiscoveryProvider {
  constructor(
    private readonly client: NineRouterClient,
    private readonly validator: SourceValidator,
    private readonly sources: string[],
    private readonly extractor?: JobContentExtractor,
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
          report: SourceReport = {
            source,
            query,
            found: 0,
            accepted: 0,
            rejected: 0,
          };
        reports.push(report);
        await progress?.sourceStarted(source);
        if (budget.remainingFetches <= 0 || signal.aborted) {
          if (signal.aborted) report.error = "TIMEOUT";
          await progress?.sourceCompleted({ ...report });
          return;
        }
        try {
          const urls = [
            ...new Set(await this.client.search(query, source, signal)),
          ].slice(0, 10);
          report.found = urls.length;
          const queue = [...urls],
            seen = budget.seenUrls;
          let fetches = 0;
          while (queue.length && budget.remainingFetches > 0) {
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
              Math.min(batchSize, budget.remainingFetches),
            );
            await Promise.all(
              batch.map(async (url) => {
                if (signal.aborted) return;
                if (!this.validator.searchCandidate(url)) {
                  report.rejected++;
                  return;
                }
                const identity = canonicalUrl(url);
                if (seen.has(identity)) return;
                seen.add(identity);
                try {
                  let resolved: string;
                  try {
                    resolved = await this.validator.resolveSearch(url, signal);
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
                  if (budget.remainingFetches <= 0) return;
                  budget.remainingFetches--;
                  fetches++;
                  const page = await this.client.fetch(resolved, signal);
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
                  await this.validator.validate(page.url, signal);
                  const finalIdentity = canonicalUrl(page.url);
                  if (
                    finalIdentity !== resolvedIdentity &&
                    seen.has(finalIdentity)
                  )
                    return;
                  seen.add(finalIdentity);
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
                        remaining,
                      ),
                    );
                    report.rejected++;
                    return;
                  }
                  if (explicitlyClosed(page.content)) {
                    report.rejected++;
                    return;
                  }
                  const job =
                    normalizeJob(page.content, canonicalUrl(page.url)) ??
                    (await this.extractor?.extract(
                      page.content,
                      canonicalUrl(page.url),
                      signal,
                    ));
                  if (!job) {
                    report.rejected++;
                    return;
                  }
                  if (signal.aborted) return;
                  jobs.push(job);
                  report.evaluated = (report.evaluated ?? 0) + 1;
                  if (!progress || (await progress.jobCandidate(job)))
                    report.accepted++;
                  else report.rejected++;
                } catch (error) {
                  report.rejected++;
                  report.error = signal.aborted
                    ? "TIMEOUT"
                    : error instanceof DiscoveryError
                      ? error.code
                      : "FETCH_OR_VALIDATION_FAILED";
                }
              }),
            );
          }
        } catch {
          report.error = signal.aborted ? "TIMEOUT" : "SEARCH_FAILED";
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
