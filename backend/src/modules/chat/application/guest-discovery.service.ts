import { JobSearchIntent } from "../domain/conversation";
import { GuestDiscovery } from "../domain/guest-conversation";
import { AgentSearchService } from "../../job-discovery/application/agent-search.service";
import { salaryConfirmed } from "../../job-discovery/domain/discovery";

export class GuestDiscoveryService {
  constructor(
    private readonly agent: AgentSearchService,
    private readonly timeout = 60000,
  ) {}

  async search(goal: JobSearchIntent): Promise<GuestDiscovery> {
    const controller = new AbortController();
    const deadline = Date.now() + this.timeout;
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const result = await this.agent.search(
        goal,
        controller.signal,
        undefined,
        undefined,
        deadline,
      );
      const jobs = result.jobs.map((job) => ({
        title: job.title,
        company: job.company,
        location: job.location,
        workType: job.workType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        salaryPeriod: job.salaryPeriod,
        source: job.source,
        sourceUrl: job.sourceUrl,
        warnings: [
          !salaryConfirmed(job, goal)
            ? "حداقل حقوق درخواستی در این آگهی تأیید نشده است."
            : "",
          job.salaryMin == null && job.salaryMax == null
            ? "حقوق در آگهی اعلام نشده است."
            : "",
        ].filter(Boolean),
      }));
      return {
        jobs,
        sources: result.sources.map(
          ({ source, found, accepted, rejected, error }) => ({
            source,
            found,
            accepted,
            rejected,
            failed: Boolean(error),
          }),
        ),
        partial: result.partial,
        ...(!jobs.length &&
        (!result.sources.length ||
          result.sources.every((source) => source.error)) &&
        !result.sources.some((source) => (source.evaluated ?? 0) > 0)
          ? { error: "JOB_DISCOVERY_UNAVAILABLE" }
          : {}),
      };
    } catch {
      return {
        jobs: [],
        sources: [],
        partial: true,
        error: "JOB_DISCOVERY_UNAVAILABLE",
      };
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}
