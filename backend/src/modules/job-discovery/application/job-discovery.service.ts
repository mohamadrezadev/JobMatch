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

export interface LiveDiscovery {
  publish(type: string, data: Record<string, unknown>): Promise<void>;
  contextVersion: number;
}
const publicSources = (sources: SourceReport[]) =>
  sources.map(({ source, found, accepted, rejected, error }) => ({
    source,
    found,
    accepted,
    rejected,
    ...(error ? { failed: true } : {}),
  }));

export class JobDiscoveryService {
  constructor(
    private readonly repository: DiscoveryRepository,
    private readonly provider: JobDiscoveryProvider,
    private readonly totalTimeout = 60000,
  ) {}
  latest(userId: string, conversationId: string) {
    return this.repository.latest(userId, conversationId);
  }
  async search(userId: string, conversationId: string, live?: LiveDiscovery) {
    const { intent, version } = await this.repository.context(
      userId,
      conversationId,
    );
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
      return {
        runId: run.id,
        jobs: run.jobs,
        sources: run.sources,
        partial: run.status === "PARTIAL",
        cached: true,
        ...(!run.jobs.length ? { code: "NO_JOBS_FOUND" as const } : {}),
      };
    }
    const controller = new AbortController();
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
      const result = await this.provider.discover(
        intent,
        controller.signal,
        live
          ? {
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
      );
      sources = result.sources;
      const jobs = deduplicate(filterAndRank(result.jobs, intent));
      const partial = result.sources.some((source) => Boolean(source.error));
      if (
        !jobs.length &&
        result.sources.every((source) => Boolean(source.error))
      )
        throw new DiscoveryError("JOB_DISCOVERY_UNAVAILABLE", 503);
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
      return completed;
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
