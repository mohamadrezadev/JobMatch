## 1. Schema

- [x] 1.1 Added `JobDiscoveryCandidate` model to `schema.prisma`: `id`, `runId` (FK to `JobDiscoveryRun`, `onDelete: Cascade`), `source`, `canonicalUrl`, `status`, `errorCode?`, `stage?`, `discoveredAt`, `lastAttemptAt`, `retryCount` (default 0). Unique on `[runId, canonicalUrl]`; index on `[runId, status]`.
- [x] 1.2 Migration `20261008072416_add_job_discovery_candidate` generated and applied; `prisma generate` picked up the new model.

## 2. Ports and contract

- [x] 2.1 Added `CandidateStatus`/`CandidateLifecycleEvent` and optional `candidateObserved?(event)` on `DiscoveryProgress` in `discovery.ports.ts`.
- [x] 2.2 Added `DiscoveryRepository.recordCandidate` (defaulted no-op) and `listCandidates` (defaulted throw), plus `CandidateRecord`/`CandidateListOptions`/`CandidateListResult` types.

## 3. Provider instrumentation

- [x] 3.1–3.8 All decision points instrumented in `NineRouterJobDiscoveryProvider.discover()`: DISCOVERED (search results + listing-expansion links), REJECTED/DUPLICATE (pre- and post-resolve), REJECTED/SOURCE_REJECTED (validator), REJECTED/NOT_JOB_DETAIL, REJECTED/CLOSED_JOB, REJECTED/BUDGET_EXHAUSTED, FAILED (reusing `this.failure()`'s existing derived code, now returned instead of only logged), TIMED_OUT (via a `try/finally` wrapping the whole per-URL handler, so every scattered `signal.aborted` early-return is covered by one fallback instead of instrumenting each individually), MATCHED / REJECTED/FILTERED_OUT (final `jobCandidate` decision).
- [x] 3.9 `emitCandidate` wraps `canonicalUrl(...)` and the callback itself in `try/catch`; no call is awaited.
- Implementation note (deviation from the original plan): rather than adding a `candidateObserved` call at every one of the ~12 scattered `if (signal.aborted) return` sites, the per-URL handler was wrapped in `try/finally` with a single `outcome` variable set at the ~9 semantically meaningful decision points; the `finally` block emits exactly one event per URL, defaulting to `TIMED_OUT` when no explicit outcome was set and the signal is aborted. This guarantees exactly one emission per URL with far less risk of an inconsistent/missed site, and was verified safe against the full existing 28-test suite (zero behavior change) before the 8 new tests were added.

## 4. Wiring

- [x] 4.1 `candidateObserved` threaded from `AgentSearchService`'s `track` object down to the provider, filtered by `selected.includes(event.source)` and `!batch.signal.aborted`, matching the existing `sourceObserved` pattern.
- [x] 4.2 `JobDiscoveryService` wires `candidateObserved` into the `live`-conditional progress object. **Correctness fix during implementation**: the first version fired each `recordCandidate` call independently (`void ...catch()`), which let concurrent un-awaited writes for the _same_ URL complete out of order — confirmed by a real-Postgres integration run where a `DISCOVERED` write landed after a `MATCHED` write and overwrote it. Fixed by chaining all of a run's candidate writes through one `let candidateQueue = Promise.resolve()` (mirroring the file's existing `acceptance` chaining pattern), guaranteeing emission-order writes while still never being awaited by the discovery loop itself. `candidateQueue` is drained (`await candidateQueue`) alongside the existing `await acceptance` before the run is reported complete.
- [x] 4.3 `PrismaDiscoveryRepository.recordCandidate`/`listCandidates` implemented. **Second correctness fix**: a URL `MATCHED` in one wave can legitimately be re-encountered as a `DUPLICATE` in a later wave (the adaptive scheduler's own cross-wave `seenUrls` dedup works exactly this way) — the naive upsert let that later duplicate signal downgrade an already-confirmed job back to `REJECTED`. Fixed by making `MATCHED` terminal: `recordCandidate` checks the existing row first and no-ops if it's already `MATCHED`. Candidate persistence applies to the authenticated discovery run (`JobDiscoveryRun`) only — guest discovery (`GuestDiscoveryService`) has no persisted run to attach records to, and the legacy non-live HTTP path (`JobDiscoveryController.search` without a `live` object) does not construct the granular progress object at all today, matching its existing (pre-this-change) behavior.

## 5. API

- [x] 5.1 `GET /api/job-discovery/runs/:id/candidates?status=&cursor=&limit=` added to `JobDiscoveryController`, owner-checked against the run's `userId` (404 for an unowned/unknown run, matching `conversations/:id/latest`).
- [x] 5.2 `limit` bounded server-side (1–200, default 50); `status` validated against the known enum, ignored (no filter) otherwise.

## 6. Tests

- [x] 6.1 `nine-router-job-discovery.provider.spec.ts`: 8 new tests, one per status/code combination, plus all 28 pre-existing tests pass unmodified (36 total).
- [x] 6.2 `prisma-discovery.repository.spec.ts`: 4 new tests — upsert shape, MATCHED-is-terminal precedence, ownership rejection, pagination/status filtering (7 total in the file).
- [x] 6.3 Real end-to-end test added to `test/integration/chat-runs.integration.spec.ts` (gated by `CHAT_RUN_DB_TEST=true`, real PostgreSQL): verifies persisted candidates after a live run (`MATCHED` for the accepted job, `REJECTED`/`DUPLICATE` for the duplicate), an unowned-user request to the new endpoint returns 404, and an owned, status-filtered request returns the expected candidate. This test is what caught both correctness bugs fixed in section 4 — a mocked unit test alone would not have surfaced either the write-ordering race or the cross-wave MATCHED-downgrade.
- [x] 6.4 Full `job-discovery` suite (and full backend suite) run: no regressions.

## 7. Verification

- [x] 7.1 `npx jest` (backend, full suite): 38 suites, 487 tests passed.
- [x] 7.2 `npx tsc --noEmit` (backend): clean.
- [x] 7.3 `npm run build` (backend): compiles (`nest build`).
- [x] 7.4 Results recorded in `verification.md`.
