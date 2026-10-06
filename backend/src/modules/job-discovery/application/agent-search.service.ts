import { JobSearchIntent } from "../../chat/domain/conversation";
import {
  deduplicate,
  DiscoveredJob,
  DiscoveryError,
  filterAndRank,
  salaryConfirmed,
  SourceReport,
} from "../domain/discovery";
import { DiscoveryProgress, JobDiscoveryProvider } from "./discovery.ports";
import {
  abortable,
  AGENT_SOURCES,
  AgentDecision,
  AgentPlannerService,
  FinishReason,
  MAX_AGENT_STEPS,
  targetJobCount,
} from "./agent-planner.service";

type Publish = (type: string, data: Record<string, unknown>) => Promise<void>;
export class AgentSearchService {
  constructor(
    private readonly provider: JobDiscoveryProvider,
    private readonly planner: AgentPlannerService,
    private readonly activeSources = AGENT_SOURCES,
  ) {}

  async search(
    intent: JobSearchIntent,
    signal: AbortSignal,
    progress?: DiscoveryProgress,
    publish?: Publish,
    deadline = Date.now() + 60000,
    rankingExperienceLevel?: string,
  ) {
    // Only aggregates go to the planner. Page content and provider diagnostics stay private.
    const goal: JobSearchIntent = JSON.parse(JSON.stringify(intent));
    const targetValidJobs = targetJobCount(goal);
    const allowed = AGENT_SOURCES.filter((source) =>
      this.activeSources.includes(source),
    );
    const searched = new Set<string>();
    const reports = new Map<string, SourceReport>();
    let jobs: DiscoveredJob[] = [],
      step = 0;
    const validCount = () =>
      jobs.filter((job) => salaryConfirmed(job, goal)).length;
    const observe = (candidates: DiscoveredJob[]) => {
      jobs = deduplicate(
        filterAndRank([...jobs, ...candidates], goal, rankingExperienceLevel),
      );
    };
    const finish = (): FinishReason | undefined =>
      signal.aborted || Date.now() >= deadline
        ? "TIME_LIMIT"
        : validCount() >= targetValidJobs
          ? "ENOUGH_RESULTS"
          : allowed.every((source) => searched.has(source))
            ? "SOURCES_EXHAUSTED"
            : step >= MAX_AGENT_STEPS
              ? "STEP_LIMIT"
              : undefined;
    await publish?.("agent.started", {
      targetValidJobs,
      maxSteps: MAX_AGENT_STEPS,
      searchMode: "parallel",
      sources: allowed,
    });
    let reason: FinishReason | undefined;
    while (!(reason = finish())) {
      step++;
      const remaining = allowed.filter((source) => !searched.has(source));
      await publish?.("agent.planning", { step });
      let decision: AgentDecision = await this.planner.decide(
        {
          goal: JSON.parse(JSON.stringify(goal)),
          searchedSources: [...searched],
          remainingSources: remaining,
          failedSources: [...reports.values()]
            .filter((report) => report.error)
            .map((report) => report.source),
          validJobCount: validCount(),
          uncertainJobCount: jobs.length - validCount(),
          step,
        },
        signal,
      );
      if (signal.aborted || Date.now() >= deadline) {
        reason = "TIME_LIMIT";
        break;
      }
      // The server controls stopping conditions even if an injected planner errs.
      if (
        decision.action === "FINISH" ||
        !decision.sources.length ||
        decision.sources.length !== remaining.length ||
        decision.sources.some((source) => !remaining.includes(source)) ||
        new Set(decision.sources).size !== decision.sources.length
      )
        decision = {
          action: "SEARCH_SOURCES",
          sources: [...remaining],
          plannerMode: "fallback",
          reasonCode: step === 1 ? "INITIAL_SEARCH" : "TOO_FEW_RESULTS",
        };
      await publish?.("agent.decision", { step, ...decision });
      const selected = decision.sources;
      selected.forEach((source) => searched.add(source));
      const before = validCount();
      // Every active source runs concurrently with the full remaining budget.
      const completedSources = new Set<string>();
      const batch = new AbortController();
      const cancel = () => batch.abort();
      signal.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(cancel, Math.max(1, deadline - Date.now()));
      const reportFor = (source: string) => {
        let report = reports.get(source);
        if (!report) {
          report = { source, query: "", found: 0, accepted: 0, rejected: 0 };
          reports.set(source, report);
        }
        return report;
      };
      const track: DiscoveryProgress = {
        sourceStarted: async (source) => {
          if (batch.signal.aborted || !selected.includes(source)) return;
          await progress?.sourceStarted(source);
        },
        sourceCompleted: async (report) => {
          if (batch.signal.aborted || !selected.includes(report.source)) return;
          reports.set(report.source, { ...report });
          completedSources.add(report.source);
          await progress?.sourceCompleted(report);
        },
        jobCandidate: async (job) => {
          if (batch.signal.aborted || !selected.includes(job.source))
            return false;
          const report = reportFor(job.source);
          report.evaluated = (report.evaluated ?? 0) + 1;
          report.found++;
          const previous = jobs.length;
          observe([job]);
          if (jobs.length === previous) {
            report.rejected++;
            return false;
          }
          const accepted = progress ? await progress.jobCandidate(job) : true;
          if (accepted) report.accepted++;
          else report.rejected++;
          return accepted;
        },
      };
      try {
        const result = await abortable(
          this.provider.discover(
            JSON.parse(JSON.stringify(goal)),
            batch.signal,
            track,
            { sources: selected },
          ),
          batch.signal,
        );
        observe(result.jobs.filter((job) => selected.includes(job.source)));
        for (const report of result.sources)
          if (selected.includes(report.source))
            reports.set(report.source, { ...report });
        for (const source of selected)
          if (!reports.has(source)) {
            reports.set(source, {
              source,
              query: "",
              found: 0,
              accepted: 0,
              rejected: 0,
              error: "PROVIDER_REPORT_MISSING",
            });
            await progress?.sourceCompleted(reports.get(source)!);
          }
      } catch (error) {
        for (const source of selected) {
          // A slow source must not turn an already finished source into a failure.
          if (completedSources.has(source)) continue;
          const report = {
            source,
            query: "",
            found: 0,
            accepted: 0,
            rejected: 0,
            ...reports.get(source),
            error: batch.signal.aborted
              ? "TIMEOUT"
              : error instanceof DiscoveryError
                ? error.code
                : "PROVIDER_FAILURE",
          };
          reports.set(source, report);
          await progress?.sourceCompleted(report);
        }
      } finally {
        batch.abort();
        clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
      }
      await publish?.("agent.observation", {
        step,
        searchedSources: [...searched],
        remainingSources: allowed.filter((source) => !searched.has(source)),
        failedSources: [...reports.values()]
          .filter((report) => report.error)
          .map((report) => report.source),
        newValidJobs: validCount() - before,
        totalValidJobs: validCount(),
        uncertainJobCount: jobs.length - validCount(),
      });
    }
    reason ??= "SOURCES_EXHAUSTED";
    await publish?.("agent.decision", {
      step,
      action: "FINISH",
      sources: [],
      reasonCode: reason,
    });
    const sources = allowed.flatMap((source) =>
      reports.has(source) ? [reports.get(source)!] : [],
    );
    const partial =
      reason === "TIME_LIMIT" ||
      reason === "STEP_LIMIT" ||
      sources.some((report) => Boolean(report.error));
    await publish?.("agent.completed", {
      step,
      reasonCode: reason,
      validJobCount: validCount(),
      uncertainJobCount: jobs.length - validCount(),
      partial,
    });
    const firstError = sources[0]?.error;
    const failureCode =
      firstError &&
      [
        "JOB_SEARCH_PROVIDER_UNAVAILABLE",
        "JOB_FETCH_PROVIDER_UNAVAILABLE",
        "JOB_FETCH_SECURITY_UNVERIFIED",
      ].includes(firstError) &&
      sources.every((source) => source.error === firstError)
        ? firstError
        : "JOB_DISCOVERY_UNAVAILABLE";
    return { jobs, sources, partial, failureCode };
  }
}
