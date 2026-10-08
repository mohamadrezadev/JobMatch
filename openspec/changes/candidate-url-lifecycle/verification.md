# Verification — candidate-url-lifecycle

Date: 2026-10-08. Scope: PRD v3.1 Phase C — per-URL lifecycle persistence and a paginated read endpoint, building on `universal-location-resolver`. No dynamic planner, live SSE roadmap events, or UI (those are PRD v3.1 Phases D/E, separately scoped).

## Completeness

All tasks complete. Two added requirements implemented. Planning artifacts validated with `openspec validate candidate-url-lifecycle`. Two real correctness bugs were found and fixed during implementation via a real-database integration test — see "Correctness bugs found and fixed" below.

## Correctness

| Requirement                               | Implementation                                                                                                                                                                            | Verification                                                                                                                                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-URL lifecycle persistence             | `JobDiscoveryCandidate` Prisma model; `candidateObserved` callback on `DiscoveryProgress`, instrumented into every existing decision point in `NineRouterJobDiscoveryProvider.discover()` | 8 new provider unit tests (one per status/errorCode combination) plus all 28 pre-existing provider tests pass unmodified; real-Postgres integration test confirms actual persisted rows after a live run |
| Paginated, owner-scoped candidate listing | `GET /api/job-discovery/runs/:id/candidates`, `PrismaDiscoveryRepository.listCandidates`                                                                                                  | Unit tests for ownership rejection and status/pagination; real HTTP integration test confirms 404 for a non-owning user and correct filtered results for the owner                                       |

## Correctness bugs found and fixed (via the real-Postgres integration test, not caught by mocked unit tests)

1. **Write-ordering race**: the first implementation fired each `recordCandidate` write independently and un-awaited. Two writes for the _same_ URL (e.g., `DISCOVERED` then `MATCHED`, emitted microseconds apart) could complete out of order, leaving the _earlier_ event as the final persisted state. Fixed by chaining all of a run's candidate writes through a single `Promise` queue (`candidateQueue`), mirroring the file's own pre-existing `acceptance` chaining pattern — writes now land in emission order, and the discovery loop still never awaits them individually.
2. **MATCHED downgraded by a later duplicate signal**: the adaptive scheduler can legitimately re-encounter an already-`MATCHED` URL in a later wave (its own cross-wave `seenUrls` dedup correctly classifies the re-encounter as a duplicate). The naive upsert let that duplicate signal overwrite the URL's status back to `REJECTED`, incorrectly "un-matching" a confirmed job. Fixed by making `MATCHED` a terminal state: `recordCandidate` reads the existing row first and no-ops if it is already `MATCHED`.

The first two bugs were invisible to mocked unit tests (which don't naturally reproduce cross-wave timing or multi-invocation state) and were only caught once a real, multi-wave, real-database run was exercised — the reason a real-Postgres integration test was added rather than relying on unit tests alone for this capability. The later boundary and input-validation findings were found during final diff review and now have focused regression tests.

3. **Timeout outcome dropped at the orchestration boundary**: the provider emitted `TIMED_OUT` from its `finally` block after cancellation, but `AgentSearchService` discarded all candidate callbacks once the batch signal was aborted. The callback now forwards terminal events after cancellation, and queued allowlisted URLs that never enter the per-URL handler are explicitly marked `TIMED_OUT`.
4. **Unvalidated URL exposure and invalid pagination input**: raw search results were initially recorded before `SourceValidator` ran and `listCandidates` returned `SOURCE_REJECTED` rows. Initial `DISCOVERED` events now require the synchronous source check, the read query excludes source-rejected rows, and non-integer `limit` values return HTTP 400 while the repository defensively defaults non-finite values.

## Checks

- Backend unit (full): 39 suites, 492 tests passed (`npx jest`, backend directory), including orchestration-after-abort, queued-timeout, source-exposure, repository-limit, and controller-limit regression coverage.
- Backend integration, `CHAT_RUN_DB_TEST=true` (real PostgreSQL): `chat-runs.integration.spec.ts`, 5 tests passed, including the new candidate-persistence/endpoint/ownership test.
- Backend integration, `JOB_DISCOVERY_DB_TEST=true` (real PostgreSQL): `job-discovery.integration.spec.ts`, 6 tests passed unmodified — confirms the legacy non-live HTTP path (which does not construct the progress object at all) is unaffected.
- TypeScript: passed (`npx tsc --noEmit -p tsconfig.json`, backend directory).
- Backend build: passed (`npm run build`, backend directory — `nest build`).
- Formatting: all changed/new files formatted with the project's Prettier config.
- Lint: not run — no ESLint configuration exists in `backend/` at this commit (pre-existing gap, documented in prior changes' verification notes).
- Frontend: untouched by this change; not re-run.

## Delivery limits

- **Precise hard-constraint mismatch reasons are not implemented.** Filter-declined candidates (wrong location/role/skill/salary) are recorded as `REJECTED` with the coarse `errorCode: "FILTERED_OUT"`, not PRD §9's specific `LOCATION_MISMATCH`/`ROLE_MISMATCH`/`REQUIRED_SKILL_MISSING`. Getting that specificity requires `filterAndRank`/the `jobCandidate` accept path to return a reason instead of a boolean — a separate, more invasive change, explicitly deferred in the design doc.
- **No live SSE events or UI.** `candidate.discovered`/`candidate.status_changed` (PRD §10) and any Roadmap display (PRD §5) are not part of this increment — this is the data layer those would be built on, per PRD v3.1's own phase split (C before D/E).
- **Guest discovery has no candidate persistence.** `GuestDiscoveryService` has no backing `JobDiscoveryRun`/repository at all; this is a pre-existing architectural fact, not a new gap introduced here.
- **The legacy non-live HTTP discovery path records no candidates.** `JobDiscoveryController.search()` calls `this.discovery.search(user.sub, conversationId)` without a `live` object, so the granular per-URL progress hooks (including `candidateObserved`) are not constructed for that call path today — this matches its existing behavior before this change (it also doesn't get live `source.progress`/`job.accepted` events either) and was not altered.
- **No retention/TTL policy** for `JobDiscoveryCandidate` rows — matches the absence of one for `JobDiscoveryRun` itself; out of scope until addressed holistically.
- **Budget-exhaustion mid-batch (`BUDGET_EXHAUSTED`) has no dedicated unit test** — the code path is exercised correctly (confirmed by reading the control flow; it emits via the same `finally`-block mechanism as every other outcome), but constructing a deterministic unit test for this specific concurrency-dependent race was judged not worth the complexity for this increment.
