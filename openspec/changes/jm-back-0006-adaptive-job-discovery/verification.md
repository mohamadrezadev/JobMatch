# Verification — jm-back-0006-adaptive-job-discovery

Date: 2026-10-07. Scope: first delivery package of PRD-005.

## Completeness

All nine tasks complete. Five added requirements implemented. Planning artifacts validated with `openspec validate jm-back-0006-adaptive-job-discovery`.

## Correctness

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Explain the result target | Shared discovery-progress helpers, ChatExperience, GuestChat and RunActivity | Five/ten server targets rendered in authenticated progress; guest ten-job target persists during source extraction; shared count hint appears in both composers |
| Deterministic staged discovery | domain/adaptive-discovery.ts and application/agent-search.service.ts | Configured source order, initial two sources, 3/3/5/8/10 ceilings, immutable goal, disabled domains and no model planner tests |
| Shared queues and ceilings | infrastructure/nine-router-job-discovery.provider.ts and nine-router.client.ts | Listing queue retained through 3/5/8/10; no repeated URLs/search when pending queue suffices; failed attempts consume cap; existing security/provenance and equivalent-query tests |
| Immediate successful stop | Serialized acceptance, separate enough flag and batch cancellation in AgentSearchService | Hung provider returns at target; uncertain/duplicate/filtered/declined jobs do not stop; late callbacks rejected; deadline results retained; real HTTP/SSE + PostgreSQL one-job target commits before hung provider completes |
| Internal performance evidence | SourceMetrics, sourceObserved snapshots, cumulative merge, safe module logger and withoutMetrics response mapping | Internal persisted fetch totals equal mock router requests; metrics absent from fresh/cache/latest HTTP and public event payloads; safe summary excludes page/query data |

## Checks

- Backend unit: 33 suites, 418 tests passed (`pnpm exec jest --runInBand --silent`, backend directory).
- Backend build: passed (`pnpm run build`, backend directory).
- TypeScript: passed (`pnpm exec tsc --noEmit --rootDir .`, backend directory).
- Frontend unit: 18 suites, 88 tests passed; frontend TypeScript check passed after the count explanation update.
- Integration: 2 suites, 11 tests passed using existing `test/jest-integration.json`, JOB_DISCOVERY_DB_TEST=true and CHAT_RUN_DB_TEST=true. Existing migrations were applied to a newly created local temporary database; it was removed after execution. No application records were added to the developer database.
- OpenSpec validation and git diff whitespace check passed.

## Pre-commit coverage

Full unit suites passed again with coverage: backend 418 tests / 33 suites, frontend 88 tests / 18 suites. Overall line coverage is 67.80% backend and 79.55% frontend. The coverage-check skill's default 95% threshold is advisory here: no required coverage gate is configured in this repository. Some changed files fall below that threshold. No pre-change coverage comparison was performed.

Changed production files (line / branch / function percentages):

| File | Lines | Branches | Functions |
| --- | ---: | ---: | ---: |
| backend/job-discovery.module.ts | 0 | 0 | 0 |
| backend/application/discovery.ports.ts | 80 | 100 | 0 |
| frontend/RunActivity.tsx | 81.39 | 74.15 | 72.22 |
| frontend/ChatExperience.tsx | 82.56 | 75 | 60 |
| frontend/lib/discovery-progress.ts | 89.28 | 71.42 | 100 |
| backend/infrastructure/nine-router.client.ts | 90.27 | 84.52 | 100 |
| frontend/GuestChat.tsx | 94.05 | 75 | 92 |
| backend/application/job-discovery.service.ts | 94.11 | 75.75 | 81.25 |
| backend/infrastructure/nine-router-job-discovery.provider.ts | 96.56 | 80 | 100 |
| backend/application/agent-search.service.ts | 97.19 | 93.27 | 94.59 |
| backend/domain/discovery.ts | 99.06 | 96.77 | 96.29 |
| backend/domain/adaptive-discovery.ts | 100 | 75 | 100 |

Backend paths in the table are relative to `backend/src/modules/job-discovery`; frontend component paths are relative to `frontend/src/components/chat` except the explicit `lib` path.

## Delivery limits

New policy and metric value types are pure domain code; orchestration remains in application, HTTP retrieval in infrastructure, and logging is wired by the Nest module. Existing sourceReports JSON stores measurements with no migration. Public metric exclusion covers fresh results, cached results and restoration.

No known critical delivery blockers. Previous active-change tests mandating all-source/model-planner behavior were updated to the new specification. Cancellation is distinguished from genuine timeout failures; work already underway at stop can have incomplete timing measurements. Agent totalMs excludes message understanding and final persistence. No live upstream benchmark, deploy, dynamic source ranking, circuit breaker, DNS cache or full-PRD completion is claimed. The sixty-second default remains.
