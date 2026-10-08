# Verification — unify-agent-run-budget

Date: 2026-10-08. Scope: Phase 1 reliability fix from `JobMatch_Agentic_PRD_v3.0.md` (unified run budget + bounded per-wave timeout), explicitly excluding planner wiring, durable queue and browser provider work.

## Completeness

All 11 tasks complete. Three added requirements implemented. Planning artifacts validated with `openspec validate unify-agent-run-budget`.

## Correctness

| Requirement                      | Implementation                                                                                                                                                                                                                       | Verification                                                                                                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unified run budget               | `domain/agent-run-budget.ts` (`AgentRunBudget`, `buildAgentRunBudget`), built once per run in `AgentSearchService.runSearch`                                                                                                         | Budget fields match deadline/sources/`MAX_SOURCE_FETCHES`/`MAX_AGENT_STEPS`/target job count for arbitrary inputs; existing `FinishReason`/`partial`/job-count behavior unchanged when no wave times out (full `job-discovery` suite green)                                                              |
| Bounded per-wave timeout         | `waveTimeoutMs` (fair share of remaining time across remaining waves, `MIN_WAVE_TIMEOUT_MS` floor, `remaining` ceiling, last wave gets full remaining time); wired into the per-wave batch `setTimeout` in `agent-search.service.ts` | Unit tests cover fair share, floor, ceiling and banked time from fast-finishing earlier waves; service-level fake-timer test proves a hanging non-final wave is cancelled and all 5 waves still run within a 100s deadline, instead of the old behavior blocking the second wave until the full deadline |
| Backward-compatible construction | No change to `AgentSearchService`'s constructor signature; budget built internally from existing `runSearch` parameters                                                                                                              | Full existing test suite (which constructs the service with only provider + planner, and with the optional `activeSources`/`recordSummary` args) passes unmodified                                                                                                                                       |

## Checks

- Backend unit (job-discovery module only): 14 suites, 238 tests passed (`npx jest src/modules/job-discovery`, backend directory).
- Backend unit (full): 37 suites, 460 tests passed (`npx jest`, backend directory).
- TypeScript: passed (`npx tsc --noEmit -p tsconfig.json`, backend directory).
- Backend build: passed (`npm run build`, backend directory — `nest build`).
- Lint: not run. No ESLint configuration file exists anywhere in `backend/` at this commit (`npx eslint ...` fails with "ESLint couldn't find a configuration file"); this is a pre-existing repository gap, not introduced by this change.
- Frontend: untouched by this change; not re-run.
- Integration/E2E/live-provider smoke tests: not run. This change does not touch HTTP contracts, Prisma schema, or provider wiring, so none were judged necessary; not a claim of live-provider behavior.

## Delivery limits

This change only bounds `AgentSearchService`'s own per-wave cancellation timer. It does not address, and makes no claim about:

- Cross-replica or distributed fetch admission (`NineRouterClient`'s process-local queue/circuit breaker, P-02 in the PRD) — unaffected, untouched.
- Wiring `AgentPlannerService.decide()` into the main loop (P-01) — the planner remains unused dead code in the main loop, exactly as before.
- Durable queue/worker execution (P-04) or a cloud browser provider (P-03) — both out of scope, unaddressed.
- `MIN_WAVE_TIMEOUT_MS` (20000ms, matching the existing per-fetch `fetchTimeout` default) is a conservative starting constant, not validated against real provider latency distributions beyond the existing mocked test suite. Per the design doc's open question, this should be revisited with real measurements before being considered final, and is intentionally not yet exposed as an environment variable.
- No live-provider timing comparison (Jobinja/JobVision/IranTalent/E-estekhdam) was performed; only mocked/fake-timer tests validate the new timing logic. Do not treat this as a live production-readiness claim.
