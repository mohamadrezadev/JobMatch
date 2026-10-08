## Why

`JobSearchGoal`-driven discovery already enforces several independent limits — a 60s run deadline (`job-discovery.service.ts`), per-wave `fetchCeiling`s (`adaptive-discovery.ts`), a 10-fetch-per-source cap (`MAX_SOURCE_FETCHES`), a 5s model-planner timeout (`AgentPlannerService`), and a 1.5s V1M timeout — but none of them share a single source of truth, and none of them protect later waves from a single slow source. In `agent-search.service.ts`, each wave's batch-cancellation timer (`runSearch`, the `setTimeout(cancel, ...)` guarding the provider call) is armed with the _full remaining run deadline_, not a bounded per-source allowance, so one hanging source can consume nearly the entire 60s budget before the next wave even starts. This is reliability work that must land before any planner or browser-provider integration (PRD v3.0 §2, §11) can be trusted to reason about remaining budget.

## What Changes

- Introduce a single `AgentRunBudget` value object, computed once per run from the existing config surface (total duration, max sources, max steps, max fetches per source, target confirmed jobs) and passed into `AgentSearchService.search`/`runSearch` instead of the ad-hoc `deadline` number and scattered constants.
- Derive a bounded **per-source-per-wave timeout** from the budget (remaining run time divided across the sources active in that wave, capped by a fixed ceiling) and use it to arm each wave's batch `AbortController`, instead of arming it with the raw remaining global deadline.
- Record budget-exhaustion as its own `FinishReason`/report detail so a wave cut short by a per-source timeout is distinguishable from a true global `TIME_LIMIT`, without changing the existing `partial` computation semantics.
- Keep `JobDiscoveryService`'s existing `totalTimeout` as the single source for overall run duration; the new budget wraps it rather than replacing it.
- No change to `AgentPlannerService` wiring, provider selection, V1M behavior, dedup/ranking, or the public HTTP/SSE contract.

## Capabilities

### New Capabilities

- `agent-run-budget`: a unified, run-scoped budget object (duration, source/step/fetch ceilings, target job count) that `AgentSearchService` consults for both the overall stop condition and per-wave timeout sizing, replacing the implicit "full remaining deadline" timer per wave.

### Modified Capabilities

(none — no `openspec/specs/` entries exist yet for job-discovery; this is a new capability, not a change to an approved spec's requirements)

## Impact

- `backend/src/modules/job-discovery/application/agent-search.service.ts` — budget construction, per-wave timer sizing, new finish-reason detail.
- `backend/src/modules/job-discovery/application/job-discovery.service.ts` — pass through existing `totalTimeout` to budget construction; no behavior change to its own timer.
- `backend/src/modules/job-discovery/application/agent-planner.service.ts` — only reads `MAX_AGENT_STEPS`/`AGENT_SOURCES`/`MAX_SOURCE_FETCHES` as budget inputs; no call-site change (planner wiring is out of scope, tracked separately).
- `backend/src/modules/job-discovery/application/discovery.ports.ts` — `MAX_SOURCE_FETCHES` consumed by the new budget type.
- `backend/src/modules/job-discovery/domain/adaptive-discovery.ts` — wave `fetchCeiling` values consumed as budget input; no change to wave construction itself.
- Tests: `agent-search.service.spec.ts`, `job-discovery.service.spec.ts`, `live-discovery.spec.ts` gain coverage for per-source timeout sizing and slow-source isolation; existing specs must keep passing unchanged.
- No API, event contract, Prisma schema, or environment variable changes.
