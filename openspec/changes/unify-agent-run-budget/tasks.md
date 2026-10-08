## 1. Domain: `AgentRunBudget`

- [x] 1.1 Create `backend/src/modules/job-discovery/domain/agent-run-budget.ts` exporting the `AgentRunBudget` interface and `buildAgentRunBudget(deadline, sources, targetConfirmedJobs)`.
- [x] 1.2 Implement `waveTimeoutMs(budget, waveIndex, totalWaves, now = Date.now())` with the fair-share-of-remaining-time formula, `MIN_WAVE_TIMEOUT_MS = 20000` floor, `remaining` ceiling, and the last-wave exception (full remaining time).
- [x] 1.3 Write `domain/agent-run-budget.spec.ts` covering: budget fields match inputs; fair share for a multi-wave run; last-wave gets full remaining time; floor is respected when remaining time is very small; result never exceeds `remaining`; banked time from fast-finishing earlier waves increases later waves' share.

## 2. Wire budget into `AgentSearchService`

- [x] 2.1 In `agent-search.service.ts`, build one `AgentRunBudget` at the top of `runSearch` via `buildAgentRunBudget(deadline, allowed, MAX_SOURCE_FETCHES, MAX_AGENT_STEPS, targetValidJobs)`.
- [x] 2.2 Replace the per-wave timer's `Math.max(1, deadline - Date.now())` with `waveTimeoutMs(budget, waveIndex - 1, waves.length)`.
- [x] 2.3 Confirmed no other behavior in `runSearch` changes: full existing `job-discovery` suite (238 tests, including `FinishReason`/`partial`/`DiscoverySummary`/event-payload assertions) passes unmodified.
- [x] 2.4 Constructor signature unchanged (provider, planner, activeSources, recordSummary) — no new required argument.

## 3. Tests

- [x] 3.1 Audited `agent-search.service.spec.ts`: no existing assertion hardcoded the old "timer = full remaining deadline" value (existing timeout tests use near-immediate deadlines of 30-100ms, where the new bounded formula and the old formula both resolve to the same near-zero remaining time); none needed updating.
- [x] 3.2 Added `"bounds a hanging non-final wave so later waves still run within the deadline"` (fake timers): a hanging source in wave 1 of 5 is cancelled (`TIMEOUT`) well before the 100s deadline, and all 5 waves execute instead of the run stalling on the first one.
- [x] 3.3 The final-wave-gets-full-remaining-time behavior is covered precisely by the domain unit test (`waveTimeoutMs` > "gives the final wave the full remaining time") rather than a separate integration test; the same service-level hanging-wave test also exercises all 5 waves including the last one. A dedicated integration test was judged redundant given the domain test's precision.
- [x] 3.4 `job-discovery.service.spec.ts` and `live-discovery.spec.ts` pass unchanged.

## 4. Verification

- [x] 4.1 Full `job-discovery` module suite: 14 suites, 238 tests passed (`npx jest src/modules/job-discovery`).
- [ ] 4.2 Live-provider before/after comparison across Jobinja/JobVision/IranTalent/E-estekhdam was **not** performed — no live provider credentials/environment available in this session. Documented as an open gap in `verification.md`; only mocked/fake-timer tests validate the new timing logic.
- [x] 4.3 `turbo build` passes for the backend workspace (`nest build`, no type errors; `tsc --noEmit` also clean). `turbo lint` was attempted but fails on `jobmatch-backend` because **no ESLint configuration file exists anywhere in `backend/`** at this commit — a pre-existing repository gap, not introduced by this change, reproducible on a clean checkout before these edits.
