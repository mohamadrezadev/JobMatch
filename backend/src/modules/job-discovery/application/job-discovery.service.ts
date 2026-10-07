import {
  DiscoveryError,
  deduplicate,
  filterAndRank,
  SourceReport,
  DiscoveredJob,
  canonicalUrl,
  normalizeText,
} from "../domain/discovery";
import { DiscoveryRepository, JobDiscoveryProvider } from "./discovery.ports";
import { AgentSearchService } from "./agent-search.service";
import { AgentPlannerService } from "./agent-planner.service";
import { publicSource } from "../domain/discovery-issue";

export interface LiveDiscovery {
  publish(type: string, data: Record<string, unknown>): Promise<void>;
  contextVersion: number;
}
const publicSources = (sources: SourceReport[]) => sources.map(publicSource);
// Keep the existing HTTP contract; measurements are stored internally only.
const withoutMetrics = <T extends { sources: SourceReport[] }>(
  result: T,
): T => ({
  ...result,
  sources: result.sources.map(({ metrics: _metrics, ...source }) => source),
});

export class JobDiscoveryService {
  constructor(
    private readonly repository: DiscoveryRepository,
    private readonly provider: JobDiscoveryProvider,
    private readonly totalTimeout = 60000,
    private readonly agent = new AgentSearchService(
      provider,
      new AgentPlannerService(),
    ),
  ) {}
  async latest(userId: string, conversationId: string) {
    const result = await this.repository.latest(userId, conversationId);
    return result ? withoutMetrics(result) : null;
  }
  async search(userId: string, conversationId: string, live?: LiveDiscovery) {
    const { intent, version, rankingExperienceLevel } =
      await this.repository.context(userId, conversationId);
    if (live && version !== live.contextVersion)
      throw new DiscoveryError("CONTEXT_CHANGED", 409);
    if (!intent.targetRoles.length)
      throw new DiscoveryError("SEARCH_ROLE_REQUIRED", 400);
    const run = await this.repository.begin(
      userId,
      conversationId,
      version,
      intent,
    );
    if (run.cached) {
      await live?.publish("search.cached", {
        jobs: run.jobs,
        sources: publicSources(run.sources),
        partial: run.status === "PARTIAL",
      });
      return withoutMetrics({
        runId: run.id,
        jobs: run.jobs,
        sources: run.sources,
        partial: run.status === "PARTIAL",
        cached: true,
        ...(!run.jobs.length ? { code: "NO_JOBS_FOUND" as const } : {}),
      });
    }
    const controller = new AbortController();
    const deadline = Date.now() + this.totalTimeout;
    const timer = setTimeout(() => controller.abort(), this.totalTimeout);
    let sources: SourceReport[] | undefined;
    const identities = new Set<string>();
    const urls = new Set<string>();
    let acceptance = Promise.resolve();
    const accept = (job: DiscoveredJob): Promise<boolean> => {
      let accepted = false;
      const task = acceptance.then(async () => {
        if (controller.signal.aborted || !filterAndRank([job], intent).length)
          return;
        const url = canonicalUrl(job.sourceUrl);
        const identity = [job.company, job.title, job.location ?? ""]
          .map(normalizeText)
          .join("|");
        if (urls.has(url) || identities.has(identity)) return;
        const saved = await this.repository.saveCandidate({
          ...job,
          sourceUrl: url,
        });
        urls.add(url);
        identities.add(identity);
        await live!.publish("job.accepted", { job: saved });
        accepted = true;
      });
      acceptance = task.catch(() => undefined);
      return task.then(() => accepted);
    };
    try {
      await live?.publish("search.started", {});
      const result = await this.agent.search(
        intent,
        controller.signal,
        live
          ? {
              sourceProgress: (source, stage) =>
                live.publish("source.progress", { source, stage }),
              sourceStarted: (source) =>
                live.publish("source.started", { source }),
              sourceCompleted: (report) =>
                live.publish(
                  report.error ? "source.failed" : "source.completed",
                  publicSources([report])[0],
                ),
              jobCandidate: accept,
            }
          : undefined,
        live?.publish,
        deadline,
        rankingExperienceLevel,
      );
      sources = result.sources;
      // A timed-out batch can leave a candidate save in flight. Drain it before
      // publishing the terminal state so accepted events cannot arrive afterward.
      await acceptance;
      const jobs = deduplicate(
        filterAndRank(result.jobs, intent, rankingExperienceLevel),
      );
      const partial = result.partial;
      if (
        !jobs.length &&
        result.sources.every((source) => Boolean(source.error)) &&
        !result.sources.some((source) => (source.evaluated ?? 0) > 0)
      )
        throw new DiscoveryError(result.failureCode, 503);
      const completed = await this.repository.complete(
        run.id,
        jobs,
        result.sources,
        partial,
      );
      await live?.publish("search.completed", {
        ...completed,
        sources: publicSources(completed.sources),
      });
      return withoutMetrics(completed);
    } catch (error) {
      controller.abort();
      const failure =
        error instanceof DiscoveryError
          ? error
          : new DiscoveryError("JOB_DISCOVERY_UNAVAILABLE", 503);
      if (sources) await this.repository.fail(run.id, failure.code, sources);
      else await this.repository.fail(run.id, failure.code);
      throw failure;
    } finally {
      clearTimeout(timer);
    }
  }
}
