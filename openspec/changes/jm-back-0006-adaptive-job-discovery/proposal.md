## Why

### Problem
Discovery currently starts all four sources with ten-page budgets and waits for a complete batch before stopping. Enough confirmed jobs can be available while unrelated slow work keeps the request open.

## What Changes

- Deterministic staged scheduling: first two sources, then remaining sources, then cumulative budgets 5/8/10.
- Retain URL queues and shared ten-page budgets across waves and equivalent queries.
- Stop in-flight discovery as soon as unique filtered salary-confirmed results reach the goal.
- Record internal per-source stage timings/counters and safe run summaries.
- Explain the default five-job target and explicit requested counts in authenticated and guest chat using the server's target event.

### Scope
In: first delivery package of PRD-005, backend scheduling, provider budgets, user-facing target explanation and regression verification.
Out: dynamic source ranking/health, DNS cache, new parsers, guest job streaming, persistence identity migration and production deployment.

### API Contract
Existing HTTP responses and public SSE events remain compatible. Internal sourceReports may contain additive metrics. Early target completion emits ENOUGH_RESULTS; intentional cancellation is not a timeout failure. No new endpoints or dependencies.

### Acceptance Criteria
Only two initial sources run; initial per-source fetch ceiling is three; expanded budgets are cumulative and never exceed ten. Confirmed unique jobs trigger immediate cancellation even when another source hangs. Uncertain salaries and duplicates never advance the confirmed goal. Accepted results survive timeouts. Security and user filters remain enforced. Core scheduling never calls the model planner.

## Capabilities

### New Capabilities
- `adaptive-job-discovery`: deterministic staged budgets, immediate successful stopping and internal performance measurements.

### Modified Capabilities
None of the previous discovery changes have been synced into named main capabilities. This change explicitly supersedes their all-sources-at-once scheduling requirements while preserving query, security and filtering constraints.

## Impact

Existing job-discovery application/domain/infrastructure and their tests. PostgreSQL sourceReports JSON stores additive measurements; no schema migration. Guest discovery inherits scheduling through AgentSearchService. Reference: openspec/prds/PRD-005-adaptive-job-discovery.md.
