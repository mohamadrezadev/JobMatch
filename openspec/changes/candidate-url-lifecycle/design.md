## Context

`NineRouterJobDiscoveryProvider.discover()` (`backend/src/modules/job-discovery/infrastructure/nine-router-job-discovery.provider.ts`) already makes a precise decision about every URL it touches — duplicate, validator-rejected, fetch/extract failure (via `this.failure()`, which already derives a specific error code and logs it), closed job, listing-page-not-a-detail-page, or extracted-and-passed-to-`progress.jobCandidate()`. None of these per-URL decisions escape the function; only aggregate `SourceReport.found/accepted/rejected` counters and a structured-but-unpersisted log line survive. `discovery-issue.ts` already has a safe, user-facing message mapper (`discoveryIssue(code)`) for most of these codes — it's just never applied to anything but the aggregate source-level `error` field.

## Goals / Non-Goals

**Goals:**

- Persist one row per unique URL per run with its final status and reason, queryable and paginated, scoped to the owning user.
- Reuse the existing error-code vocabulary (`discovery-issue.ts`'s codes) wherever a code is already computed; only introduce new codes for decision points that currently have none (duplicate, not-a-job-detail page, closed job, budget exhaustion).
- Zero behavior change to discovery itself: the new callback is additive, optional, and never awaited inside the hot per-URL loop.
- A URL cut short by the run deadline (not yet fetched/extracted when the signal aborts) is recorded as `TIMED_OUT`, never silently omitted.

**Non-Goals (explicitly deferred):**

- Precise hard-constraint mismatch reasons (`LOCATION_MISMATCH`, `ROLE_MISMATCH`, `REQUIRED_SKILL_MISSING`) — `filterAndRank` and the `jobCandidate` accept/decline path currently return only a boolean. Teaching them to return _why_ is a separate, more invasive change to `discovery.ts`/`agent-search.service.ts`/`job-discovery.service.ts`'s filtering chain. This increment records filter-declined candidates as `REJECTED` with a coarser `FILTERED_OUT` code.
- Live SSE events (`candidate.discovered`, `candidate.status_changed`) and any UI — PRD v3.1 Phase E, a separate later change built on top of this data model.
- A live, multi-row status history per URL (DISCOVERED → VALIDATED → FETCHED → ...). This increment persists one row per URL representing its _final_ reached state, upserted idempotently; a full timeline is not needed to answer "what happened to this link," only its outcome.

## Decisions

**1. One upserted row per `(runId, canonicalUrl)`, not an append-only event log.**
The user-facing question this answers is "what happened to this link," not "show me its full history." A single row keyed by `(runId, canonicalUrl)` with `status`/`errorCode`/`lastAttemptAt`/`retryCount` answers that directly and is trivial to upsert from any of the provider's existing decision points, regardless of how many times the same URL is revisited across waves. Alternative considered: a full event-sourced history table — rejected as unnecessary complexity for this increment's actual requirement; nothing in PRD §9's required fields needs more than "final outcome + retry count."

**2. `candidateObserved` is synchronous and best-effort; a persistence failure must never fail or slow discovery.**

```ts
// discovery.ports.ts
export interface CandidateLifecycleEvent {
  source: string;
  url: string; // already canonicalized
  status: "DISCOVERED" | "REJECTED" | "FAILED" | "TIMED_OUT" | "MATCHED";
  errorCode?: string;
  stage?: string;
}
export interface DiscoveryProgress {
  // ...existing members unchanged...
  candidateObserved?(event: CandidateLifecycleEvent): void;
}
```

The provider calls `progress?.candidateObserved?.(event)` the same way it already calls `progress?.sourceObserved?.(report)` — synchronously, not awaited. The repository implementation fires its upsert without the caller waiting on it (`void this.repository.recordCandidate(...).catch(() => undefined)` at the orchestration layer that owns the repository, not inside the provider itself, which has no repository dependency). A candidate-tracking bug or a transient DB hiccup must degrade to "this diagnostic row is missing," never to "the search failed" or "the search got slower." Alternative considered: awaiting the write per URL — rejected because it would add a DB round-trip to the hot per-URL loop that PRD v3.0's own budget work (`unify-agent-run-budget`) was specifically about protecting.

**3. Status set is simplified from PRD §9's eight-value enum to five values that the provider can assign unambiguously today.**
PRD §9 lists `DISCOVERED, URL_VALIDATED, FETCHED, EXTRACTED, MATCHED, REJECTED, FAILED, TIMED_OUT`. Per decision 1 (final-state-only, not a timeline), the intermediate states (`URL_VALIDATED`, `FETCHED`, `EXTRACTED`) only matter as a _stage marker_ when a URL is cut short — captured instead via the optional `stage` field (reusing the provider's existing `stage` variable: `"validate" | "fetch" | "extract" | "page"`) alongside a terminal `TIMED_OUT`/`FAILED` status. The five terminal statuses actually used: `DISCOVERED` (found by search but the run ended before it was ever attempted — can happen if the deadline/budget is hit before the queue drains), `REJECTED` (duplicate, validator-rejected, not-a-job-detail, closed, or filtered out — a content-level exclusion, not a technical failure), `FAILED` (fetch/extract/provider/HTTP error — a technical failure, using the existing `this.failure()`-derived code), `TIMED_OUT` (the run's signal aborted while this URL was mid-flight), `MATCHED` (extracted and accepted by `progress.jobCandidate()`).

**4. Error codes: reuse `discovery-issue.ts`'s vocabulary; add exactly four new ones.**
`FETCH_TIMEOUT`, `SEARCH_TIMEOUT`, `EXTRACTION_TIMEOUT`, `PAGE_*`, `*_HTTP_*`, `JOB_FETCH_PROVIDER_UNAVAILABLE`, `FETCH_PROVENANCE_MISSING`, `EXTRACTION_NO_POSTING`, `SOURCE_REJECTED` already exist and already have safe public messages via `discoveryIssue()`. New: `DUPLICATE` (URL already seen this run), `NOT_JOB_DETAIL` (page was a listing, not a posting), `CLOSED_JOB` (`explicitlyClosed()` already detects this, just never named it as a reason before), `BUDGET_EXHAUSTED` (fetch budget ran out before this URL's turn), `FILTERED_OUT` (passed extraction but declined by hard-constraint filtering — see Non-Goals for why this isn't more specific yet).

**5. The paginated endpoint excludes anything `SourceValidator`/the allowlist would reject from being shown as a clickable link, per PRD §5.3 and §9.**
Candidate rows store the canonical URL that already passed (or failed) the existing `SourceValidator.allowed()`/`searchCandidate()` checks at the time they were recorded — a URL that failed validation is still shown (status `REJECTED`, code e.g. `SOURCE_REJECTED`) because the user needs to know it was found and rejected, but the response never includes a URL that wasn't already subject to the existing SSRF/allowlist checks (nothing new here: the stored `canonicalUrl` is always one the provider already processed through the existing validator, never raw unvalidated input).

## Risks / Trade-offs

- **[Risk]** Adding a write path (even fire-and-forget) to the hottest part of the discovery pipeline risks a subtle behavior change if not implemented carefully. → **[Mitigation]** The callback is purely additive (new optional interface member, default no-op when absent), called at existing decision points without altering any existing return value, loop condition, or error classification; the full `nine-router-job-discovery.provider.spec.ts` suite (which already exercises every one of these decision points) must pass unmodified except for new assertions on the new callback.
- **[Risk]** Upserting one row per unique URL per run adds DB load proportional to URLs-touched-per-run (dozens, not thousands) on top of existing writes. → **[Mitigation]** Fire-and-forget (decision 2) means this never blocks the critical path; volume is bounded by the same `MAX_SOURCE_FETCHES`/wave budgets already governing the run, so it scales with existing, already-bounded work.
- **[Risk]** `FILTERED_OUT` as a catch-all reason is less useful than PRD §9's precise per-constraint reasons. → **[Mitigation]** Explicitly documented as deferred (Non-Goals); still strictly better than today (zero per-URL visibility at all), and the schema's `errorCode` is a plain string, so a future increment can introduce more specific codes without a migration.
- **[Risk]** A URL that's `DUPLICATE` within the same run across different waves could race the upsert. → **[Mitigation]** Upsert keyed on `(runId, canonicalUrl)` with `retryCount` incremented, not overwritten blindly; last-write-wins on `status`/`errorCode`/`lastAttemptAt` is acceptable since we only need the final outcome (decision 1).

## Migration Plan

New Prisma model `JobDiscoveryCandidate`, FK to `JobDiscoveryRun.id` (`onDelete: Cascade`, so cleaning up a run cleans up its candidates). New migration file via `prisma migrate dev`. No change to any existing table. Rollback: revert the migration (drop the new table) and the code change together; no existing data is touched. New endpoint is purely additive (new route, new controller method) — no existing route changes.

## Open Questions

- Should `JobDiscoveryCandidate` rows be pruned/TTL'd eventually (a busy user could accumulate many rows across repeated searches)? Deferred — no retention policy exists for `JobDiscoveryRun` itself either; out of scope until that's addressed holistically.
