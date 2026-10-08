## Context

`AgentSearchService.runSearch` (`backend/src/modules/job-discovery/application/agent-search.service.ts`) drives discovery in waves produced by `discoveryWaves()` (`domain/adaptive-discovery.ts`): `[first 2 sources, remaining sources, then 3 full-source rounds at fetchCeiling 5/8/10, then up to 3 more query rounds at ceiling 10]`. Each wave calls `this.provider.discover(...)` under a per-wave `AbortController` (`batch`) whose timer is currently:

```ts
const timer = setTimeout(cancel, Math.max(1, deadline - Date.now()));
```

`deadline` is the single absolute run deadline (`Date.now() + totalTimeout`, default 60s, set in `JobDiscoveryService.search`). Because every wave's batch timer is armed with however much of that 60s is _still left_, a wave containing a hanging/slow source can occupy nearly the entire remaining run budget before `batch.abort()` fires — even though 6-9 more waves may still be queued behind it with useful work to do. The outer loop's own stop condition (`finish()`) only checks the same global deadline/signal, so it cannot intervene earlier.

Separately, the limits that _do_ exist — `MAX_SOURCE_FETCHES` (10, `discovery.ports.ts`), wave `fetchCeiling`s (`adaptive-discovery.ts`), `MAX_AGENT_STEPS` (4, `agent-planner.service.ts`), `AgentPlannerService`'s own 5s LLM timeout, and `NineRouterClient`'s `searchTimeout`/`fetchTimeout` (20s each, `job-discovery.module.ts`) — are each read from a different file with no shared type or construction point. Nothing in `agent-search.service.ts` currently reasons about "how much of the budget is left" in a way other components could reuse (e.g., a future planner integration, PRD v3.0 §6).

## Goals / Non-Goals

**Goals:**

- Give `AgentSearchService` one `AgentRunBudget` value, built once per run, as the single source of truth for duration/source/step/fetch ceilings it already enforces today.
- Bound each wave's batch timer to a fair share of the _remaining_ run deadline instead of the full remaining deadline, so a stuck source's wave is cut loose in time for later waves to run.
- Keep the fix entirely inside `agent-search.service.ts` + one new pure domain helper — no new services, no new Nest providers, no new env vars required to ship it.
- Preserve every existing observable behavior when there is no slow/hanging source: wave count, fetch ceilings, `FinishReason`s, `DiscoverySummary`, SSE event payloads, and `partial` computation must be unchanged for the happy path and for existing fixture-based specs.

**Non-Goals:**

- Wiring `AgentPlannerService.decide()` into the main loop (tracked separately; it stays unused dead code for this change, consistent with the existing `plannerMode: "fallback"` hardcoding).
- Any change to `NineRouterClient`'s concurrency/circuit-breaker (process-local admission, P-02) or to a durable queue (P-04) — this change only affects `AgentSearchService`'s own per-wave timer, not cross-replica coordination.
- Introducing a browser provider, a monetary/token budget, or any new `FinishReason` enum value. A per-wave sub-timeout continues to surface as the existing per-source `"TIMEOUT"` `SourceReport.error` (already set in the wave's `catch` block when `batch.signal.aborted`); the overall run's `FinishReason` stays governed by the global deadline exactly as today.
- Feature-flagging this change. It is a bug fix to an existing reliability path, not a new mode — there is no legacy behavior worth preserving behind a flag, matching Phase 1's framing in PRD v3.0 §18 as baseline reliability work rather than opt-in agentic behavior.

## Decisions

**1. New pure domain module `domain/agent-run-budget.ts`, not a NestJS service.**
`adaptive-discovery.ts`, `discovery.ts`, and `job-normalizer.ts` are all dependency-free, directly unit-testable domain logic. The budget type and its timeout math have the same shape (pure functions over primitives) and the same testing needs (deterministic, no fake timers needed beyond `Date.now()` injection). Alternative considered: extend `agent-planner.service.ts` where `AGENT_SOURCES`/`MAX_AGENT_STEPS`/`targetJobCount` already live — rejected because that file is about planner _decisions_, and mixing in budget/timeout math would make the "planner is currently unwired" fact (P-01) harder to see in a future diff.

```ts
// domain/agent-run-budget.ts
export interface AgentRunBudget {
  deadline: number; // absolute ms epoch; identical semantics to today's `deadline`
  maxSources: number; // AGENT_SOURCES.length, informational/validatable
  maxSteps: number; // MAX_AGENT_STEPS
  maxFetchesPerSource: number; // MAX_SOURCE_FETCHES
  targetConfirmedJobs: number; // targetJobCount(goal)
}

export function buildAgentRunBudget(
  deadline: number,
  sources: readonly string[],
  targetConfirmedJobs: number,
): AgentRunBudget {
  /* assembles the above from existing constants */
}

// Fair share of the remaining deadline across the waves still queued,
// floor/ceiling bounded; the final wave gets whatever time is left.
export function waveTimeoutMs(
  budget: AgentRunBudget,
  waveIndex: number,
  totalWaves: number,
  now = Date.now(),
): number {
  /* see decision 2 */
}
```

**2. Per-wave timeout = bounded fair share of remaining time, last wave gets the rest.**

```
remaining = budget.deadline - now
remainingWaves = totalWaves - waveIndex        // includes the current wave
isLastWave = waveIndex === totalWaves - 1
fairShare  = isLastWave ? remaining : Math.ceil(remaining / remainingWaves)
result     = clamp(fairShare, MIN_WAVE_TIMEOUT_MS, remaining)
```

`remainingWaves` is recomputed from the _current_ point in the loop (not the original wave count), so a run that finishes early waves quickly automatically banks more time for later ones instead of using a fixed static split. `MIN_WAVE_TIMEOUT_MS` is a floor so a single wave is never starved below a workable amount even late in the run; `remaining` itself is always the ceiling, so the budget can never be exceeded. Alternative considered: a fixed per-wave cap (e.g., flat 15s) regardless of remaining time — rejected because the last one or two waves (full-source rounds at `fetchCeiling` 8/10) legitimately need more time than earlier small-ceiling waves, and a flat cap would shrink the existing 60s-effective-budget for those waves even when nothing is actually slow.

**3. `MIN_WAVE_TIMEOUT_MS` starts as a named constant, not an env var, pending real latency data.**
`NineRouterClient`'s own `fetchTimeout` defaults to 20000ms per fetch, and a wave can require several fetches per source depending on `fetchCeiling`. Setting the floor below a single fetch's own timeout would make the fix actively worse (cutting off a source before even one fetch could time out on its own). We set `MIN_WAVE_TIMEOUT_MS = 20000` (matching `fetchTimeout`) as a conservative starting point, hardcoded next to the function, and revisit with an env override only if Phase 1's own metrics capture (PRD v3.0 §18, Phase 1 exit criteria) shows it needs tuning. Alternative considered: make it configurable from day one via the existing `bounded("...", default)` module pattern — deferred, not rejected outright; premature to expose a knob before we have a measured reason to turn it (see Open Questions).

**4. `AgentSearchService` constructor stays backward-compatible.**
`runSearch` builds the `AgentRunBudget` internally from its existing parameters (`deadline`, `this.activeSources`, `targetValidJobs`) rather than taking it as a new constructor argument. This keeps `new AgentSearchService(provider, planner)` (used throughout the existing specs and `JobDiscoveryService`'s default) working unchanged — no call-site updates needed outside the service itself.

## Risks / Trade-offs

- **[Risk]** A conservative floor still cuts off a genuinely slow-but-healthy source more often than the old "full remaining deadline" behavior, lowering confirmed-job yield on some runs. → **[Mitigation]** Default floor matches the existing per-fetch timeout (20s) so we're not introducing a _new_ kind of timeout shorter than one already tolerated elsewhere; Phase 1's own exit criteria (PRD §18) already calls for before/after metrics on Jobinja/JobVision/IranTalent/E-estekhdam, which will surface this directly.
- **[Risk]** The two early waves (`sources.slice(0,2)` then `sources.slice(2)`) have different source-set sizes but the same fair-share formula — could feel arbitrary. → **[Mitigation]** The formula is independent of how many sources are _in_ a wave (it only reasons about wave _count_ and remaining time); unit tests cover both wave shapes explicitly to confirm this is intentional, not an oversight.
- **[Risk]** Existing fake-timer-based assertions in `agent-search.service.spec.ts` may hardcode the old "timer = full remaining deadline" expectation. → **[Mitigation]** Tasks include an explicit audit pass over that spec file; any assertion tied to the old timer value is updated to the new fair-share value, not silently loosened.
- **[Risk]** This only bounds `AgentSearchService`'s own cancellation timer; it does nothing for cross-replica fetch admission (P-02) or durable execution (P-04). A deployment with many concurrent runs can still see queueing delay inside `NineRouterClient` that this change cannot see or budget for. → **[Mitigation]** Explicitly out of scope and stated as such in this document and the proposal; tracked as separate follow-up phases per PRD v3.0 §18.

## Migration Plan

No schema, API, event, or environment changes. This is an internal refactor of `agent-search.service.ts` plus one new pure domain file. Deploy as a normal code change; rollback is a plain revert (no data migration, no flag to flip). Before merging, run the existing `job-discovery` spec suite plus any new budget/timeout unit tests, and manually compare a small set of representative searches (the four approved sources) against pre-change timing to confirm no regression in confirmed-job counts, per PRD §18 Phase 1 exit criteria.

## Open Questions

- Should `MIN_WAVE_TIMEOUT_MS` (and the fair-share divisor) become env-configurable immediately, or only after Phase 1 metrics show a concrete need? Leaning toward hardcoded-for-now (decision 3); revisit once real latency numbers exist.
- Should `DiscoverySummary`/source metrics gain a field recording the actual wave timeout used, for observability parity with the PRD's KPI goals (§16)? Nice-to-have; not required for the core fix, can be added in tasks if low-cost.
