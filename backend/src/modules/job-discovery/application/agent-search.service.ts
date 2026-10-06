import { JobSearchIntent } from "../../chat/domain/conversation";
import {
  deduplicate,
  DiscoveredJob,
  DiscoveryError,
  filterAndRank,
  salaryConfirmed,
  SourceReport,
  queryRoundsFor,
} from "../domain/discovery";
import {
  DiscoveryProgress,
  JobDiscoveryProvider,
  MAX_SOURCE_FETCHES,
  SourceDiscoveryBudget,
} from "./discovery.ports";
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
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted || Date.now() >= deadline) cancel();
    const timer = setTimeout(cancel, Math.max(1, deadline - Date.now()));
    try {
      return await this.runSearch(
        intent,
        controller.signal,
        progress,
        publish,
        deadline,
        rankingExperienceLevel,
      );
    } finally {
      controller.abort();
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    }
  }

  private async runSearch(
    intent: JobSearchIntent,
    signal: AbortSignal,
    progress: DiscoveryProgress | undefined,
    publish: Publish | undefined,
    deadline: number,
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
    const rounds = queryRoundsFor(goal).slice(0, MAX_AGENT_STEPS);
    const budgets = new Map<string, SourceDiscoveryBudget>(
      allowed.map((source) => [
        source,
        {
          remainingFetches: MAX_SOURCE_FETCHES,
          seenUrls: new Set<string>(),
        },
      ]),
    );
    const permanentFailures = new Set([
      "JOB_SEARCH_PROVIDER_UNAVAILABLE",
      "JOB_FETCH_PROVIDER_UNAVAILABLE",
      "JOB_FETCH_SECURITY_UNVERIFIED",
    ]);
    let jobs: DiscoveredJob[] = [],
      step = 0;
    const remainingSources = () =>
      step < rounds.length
        ? allowed.filter(
            (source) =>
              budgets.get(source)!.remainingFetches > 0 &&
              !permanentFailures.has(reports.get(source)?.error ?? ""),
          )
        : [];
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
          : !remainingSources().length
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
      const remaining = remainingSources();
      const queryTitles = rounds[step];
      step++;
      await publish?.("agent.planning", { step });
      let decision: AgentDecision;
      try {
        decision = await abortable(
          this.planner.decide(
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
          ),
          signal,
        );
      } catch {
        if (signal.aborted || Date.now() >= deadline) {
          reason = "TIME_LIMIT";
          break;
        }
        decision = {
          action: "SEARCH_SOURCES",
          sources: remaining,
          reasonCode: step === 1 ? "INITIAL_SEARCH" : "TOO_FEW_RESULTS",
          plannerMode: "fallback",
        };
      }
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
      if (signal.aborted || Date.now() >= deadline) {
        reason = "TIME_LIMIT";
        break;
      }
      const selected = decision.sources;
      selected.forEach((source) => searched.add(source));
      const before = validCount();
      const previousReports = new Map(reports);
      const attemptReports = new Map<string, SourceReport>();
      const applyReport = (report: SourceReport) => {
        attemptReports.set(report.source, { ...report });
        const previous = previousReports.get(report.source);
        const merged = {
          ...report,
          found: (previous?.found ?? 0) + report.found,
          accepted: (previous?.accepted ?? 0) + report.accepted,
          rejected: (previous?.rejected ?? 0) + report.rejected,
          ...(previous?.evaluated != null || report.evaluated != null
            ? {
                evaluated: (previous?.evaluated ?? 0) + (report.evaluated ?? 0),
              }
            : {}),
        };
        reports.set(report.source, merged);
        return merged;
      };
      // Every active source runs concurrently with the full remaining budget.
      const completedSources = new Set<string>();
      const batch = new AbortController();
      const cancel = () => batch.abort();
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) cancel();
      const timer = setTimeout(cancel, Math.max(1, deadline - Date.now()));
      const reportFor = (source: string) => {
        let report = attemptReports.get(source);
        if (!report) {
          report = { source, query: "", found: 0, accepted: 0, rejected: 0 };
          attemptReports.set(source, report);
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
          const merged = applyReport(report);
          completedSources.add(report.source);
          await progress?.sourceCompleted(merged);
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
            { sources: selected, queryTitles: [...queryTitles], budgets },
          ),
          batch.signal,
        );
        observe(result.jobs.filter((job) => selected.includes(job.source)));
        for (const report of result.sources)
          if (selected.includes(report.source)) applyReport(report);
        for (const source of selected)
          if (
            !attemptReports.has(source) ||
            (!result.sources.some((report) => report.source === source) &&
              !completedSources.has(source))
          ) {
            const merged = applyReport({
              ...reportFor(source),
              error: "PROVIDER_REPORT_MISSING",
            });
            await progress?.sourceCompleted(merged);
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
            ...attemptReports.get(source),
            error: batch.signal.aborted
              ? "TIMEOUT"
              : error instanceof DiscoveryError
                ? error.code
                : "PROVIDER_FAILURE",
          };
          const merged = applyReport(report);
          await progress?.sourceCompleted(merged);
        }
      } finally {
        batch.abort();
        clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
      }
      await publish?.("agent.observation", {
        step,
        searchedSources: [...searched],
        remainingSources: remainingSources(),
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
