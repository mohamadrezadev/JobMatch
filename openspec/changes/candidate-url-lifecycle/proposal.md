## Why

Today, when a search returns zero confirmed jobs, the only thing persisted is an aggregate `SourceReport` (`found`/`accepted`/`rejected` counts) — no individual URL, its status, or why it was excluded is ever stored. PRD v3.1 §9 names this as the "۵۷ لینک پیدا شد و ۰ آگهی تأیید شد" problem: users see a number with no way to understand what actually happened to any specific link. This change adds durable, queryable per-URL lifecycle tracking, building on the location-matching fix already shipped (`universal-location-resolver`) and preceding the larger dynamic-planner/live-roadmap phases (D/E), exactly as PRD v3.1 §14 phases this work.

## What Changes

- Add a `JobDiscoveryCandidate` Prisma model: one row per unique URL encountered during a run, with `runId`, `source`, `canonicalUrl`, `discoveredAt`, `status`, `errorCode`, `lastAttemptAt`, `retryCount`, and `lastStepId` (the pipeline stage reached).
- Extend `DiscoveryProgress` with one new optional callback, `candidateObserved?(event)`, mirroring the existing optional `sourceObserved`/`sourceProgress` pattern — additive, non-breaking, and a no-op fire-and-forget call (never awaited in the hot per-URL loop, so it cannot slow down discovery or change its behavior).
- `NineRouterJobDiscoveryProvider` calls `candidateObserved` at the points it already decides a URL's fate (duplicate, validator rejection, fetch/extract failure with the existing error code, closed job, not-a-job-detail page, accepted/declined by filters, or cut off by the run deadline) — reusing the **existing** error-code vocabulary (`discovery-issue.ts`) instead of inventing a parallel one, plus a handful of new codes for cases that currently have no code at all (`DUPLICATE`, `NOT_JOB_DETAIL`, `CLOSED_JOB`, `BUDGET_EXHAUSTED`).
- `JobDiscoveryService`/`AgentSearchService` thread this callback down to the repository, which upserts one row per `(runId, canonicalUrl)` — idempotent, since a URL can be revisited across waves/query rounds.
- Add `GET /api/job-discovery/runs/:id/candidates?status=&cursor=&limit=` — paginated, owner-checked (same ACL pattern as the existing `conversations/:id/latest` route), excluding any URL the existing `SourceValidator`/allowlist logic would already reject from being shown.
- No change to the public search response contract, SSE events, or the UI — this increment is the data layer only (PRD v3.1 Phase C). Live `candidate.discovered`/`candidate.status_changed` SSE events and the Roadmap UI are Phase E, a separate later change.

## Capabilities

### New Capabilities

- `candidate-url-lifecycle`: persists the final status and reason for every URL a discovery run touches, queryable and paginated, scoped to the owning user and run.

### Modified Capabilities

(none — no `openspec/specs/` entries exist yet for job-discovery)

## Impact

- `backend/src/prisma/schema.prisma` — new `JobDiscoveryCandidate` model; new migration.
- `backend/src/modules/job-discovery/application/discovery.ports.ts` — new optional `candidateObserved` member on `DiscoveryProgress`; new `DiscoveryRepository.recordCandidate(...)` method (defaulted, like the existing `saveCandidate`) and `listCandidates(...)`.
- `backend/src/modules/job-discovery/infrastructure/nine-router-job-discovery.provider.ts` — additive `candidateObserved` calls at existing decision points; no change to existing control flow, return values, or error codes.
- `backend/src/modules/job-discovery/infrastructure/prisma-discovery.repository.ts` — implements `recordCandidate`/`listCandidates`.
- `backend/src/modules/job-discovery/application/job-discovery.service.ts`, `agent-search.service.ts` — thread the callback through, same pattern as `sourceStarted`/`sourceCompleted`.
- `backend/src/modules/job-discovery/presentation/job-discovery.controller.ts` — new paginated endpoint.
- Explicitly deferred (documented, not silently dropped): precise hard-constraint mismatch reasons (`LOCATION_MISMATCH`/`ROLE_MISMATCH`/`REQUIRED_SKILL_MISSING`) require `filterAndRank` to return a reason instead of a boolean — out of scope for this increment; filter-declined candidates are recorded as `REJECTED` with a coarser `FILTERED_OUT` code for now.
