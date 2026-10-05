import {
  DiscoveryError,
  deduplicate,
  filterAndRank,
  SourceReport,
} from "../domain/discovery";
import { DiscoveryRepository, JobDiscoveryProvider } from "./discovery.ports";

export class JobDiscoveryService {
  constructor(
    private readonly repository: DiscoveryRepository,
    private readonly provider: JobDiscoveryProvider,
    private readonly totalTimeout = 60000,
  ) {}
  latest(userId: string, conversationId: string) {
    return this.repository.latest(userId, conversationId);
  }
  async search(userId: string, conversationId: string) {
    const { intent, version } = await this.repository.context(
      userId,
      conversationId,
    );
    if (!intent.targetRoles.length)
      throw new DiscoveryError("SEARCH_ROLE_REQUIRED", 400);
    const run = await this.repository.begin(
      userId,
      conversationId,
      version,
      intent,
    );
    if (run.cached)
      return {
        runId: run.id,
        jobs: run.jobs,
        sources: run.sources,
        partial: run.status === "PARTIAL",
        cached: true,
        ...(!run.jobs.length ? { code: "NO_JOBS_FOUND" as const } : {}),
      };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.totalTimeout);
    let sources: SourceReport[] | undefined;
    try {
      const result = await this.provider.discover(intent, controller.signal);
      sources = result.sources;
      const jobs = deduplicate(filterAndRank(result.jobs, intent));
      const partial = result.sources.some((source) => Boolean(source.error));
      if (
        !jobs.length &&
        result.sources.every((source) => Boolean(source.error))
      )
        throw new DiscoveryError("JOB_DISCOVERY_UNAVAILABLE", 503);
      return await this.repository.complete(
        run.id,
        jobs,
        result.sources,
        partial,
      );
    } catch (error) {
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
