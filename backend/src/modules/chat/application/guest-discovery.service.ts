import { JobSearchIntent } from "../domain/conversation";
import { GuestDiscovery } from "../domain/guest-conversation";
import { AgentSearchService } from "../../job-discovery/application/agent-search.service";
import {
  salaryConfirmed,
  DiscoveryError,
} from "../../job-discovery/domain/discovery";
import {
  publicSource,
  discoveryIssue,
} from "../../job-discovery/domain/discovery-issue";
export type GuestProgress = (
  type: string,
  data: Record<string, unknown>,
) => Promise<void>;

export class GuestDiscoveryService {
  constructor(
    private readonly agent: AgentSearchService,
    private readonly timeout = 60000,
  ) {}

  async search(
    goal: JobSearchIntent,
    publish?: GuestProgress,
  ): Promise<GuestDiscovery> {
    const controller = new AbortController();
    const deadline = Date.now() + this.timeout;
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const result = await this.agent.search(
        goal,
        controller.signal,
        publish
          ? {
              sourceStarted: (source) => publish("source.started", { source }),
              sourceProgress: (source, stage) =>
                publish("source.progress", { source, stage }),
              sourceCompleted: (report) =>
                publish(
                  report.error ? "source.failed" : "source.completed",
                  publicSource(report),
                ),
              jobCandidate: async () => true,
            }
          : undefined,
        publish,
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
        sources: result.sources.map((report) => ({
          ...publicSource(report),
          failed: Boolean(report.error),
        })),
        partial: result.partial,
        ...(!jobs.length &&
        (!result.sources.length ||
          result.sources.every((source) => source.error)) &&
        !result.sources.some((source) => (source.evaluated ?? 0) > 0)
          ? { error: "JOB_DISCOVERY_UNAVAILABLE" }
          : {}),
      };
    } catch (error) {
      const code =
        error instanceof DiscoveryError
          ? error.code
          : "JOB_DISCOVERY_UNAVAILABLE";
      return {
        jobs: [],
        sources: [],
        partial: true,
        error: code,
        issue: discoveryIssue(code),
      };
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}
