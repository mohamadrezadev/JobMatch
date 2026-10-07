## Context

AgentSearchService already owns filtering, query equivalents and cumulative budgets; the provider owns safe retrieval. Four concurrent sources and three-page batches delay stopping. Main specs have not yet incorporated the active discovery changes. PRD-005 documents the full roadmap; this delivery implements its first package.

## Goals / Non-Goals

Goals: staged resource use, immediate target stopping, safe metrics, retained progress and immutable constraints.
Non-Goals: dynamic ranking, cross-instance health/concurrency, DNS cache, new parser formats, guest incremental jobs and database identity changes.

## Decisions

- Keep the existing modular monolith and ports. Pure domain policy generates waves: original query on first two sources at ceiling 3, remaining sources at 3, all at 5/8/10; up to three subsequent equivalent queries use remaining budgets. Source preference follows configured allowlist order. Each ceiling counts all previously attempted fetches. A source with no remaining pages or permanent provider failure is skipped.
- Do not invoke the model planner for waves. Existing injected planner API remains compatible for other callers, but core search publishes deterministic decisions. Curated query variants remain bounded to four.
- Extend run-local SourceDiscoveryBudget with pending URL queue and query/search-limit state. Expanded search requests expose more URLs without losing listing-derived links. All attempted fetches share the ten-page cap; canonical seen URLs prevent duplicates. Compatibility callers without wave options retain the ten-page behavior.
- Serialize application acceptance so filtering, deduplication, successful persistence/publication and goal checks are ordered. Abort the batch only after the accepted callback settles. A separate successful-stop flag distinguishes ENOUGH_RESULTS from cancellation/deadline. Race providers that ignore cancellation, preserve streamed jobs, and ignore late callbacks.
- Internal additive source metrics aggregate timings and actual counts, not job callbacks as URL counts. Persist through sourceReports JSON. Safe structured summaries contain counters/timings only. Do not expose internal metrics through publicSource/SSE. Stage milliseconds are accumulated operation time, totalMs is elapsed wall time.
- Preserve the 60-second configured deadline. A shorter default and p95 commitments require a fresh benchmark. Keep production unchanged until delivery is reviewed.
- Show a shared count hint in both chat composers and the actual target from agent.started.targetValidJobs throughout live progress. An explicit ten-job request displays ten, while the default displays five. State the target as a goal, not a promise of available vacancies. Guest target text resets for each new message. Retain historical parallel-event rendering.

## Risks / Trade-offs

- Staging can delay discovery when the first sources return poor results → expand deterministically and retain equivalent queries.
- Upstream may not honor cancellation → race promises, block late callbacks and prohibit starting new requests after abort.
- Existing tests mandate all-source rounds → replace those expectations with staged source/budget invariants while retaining security tests.
- Small search results can be listings → preserve listing-derived queues and count listing Fetches within the same ceiling.
- Successful target completion can coexist with source errors → preserve diagnostics, but define goal completion as non-partial; exhausted/deadline runs retain partial semantics.

## Migration Plan

No schema or dependency migration. Validate OpenSpec, unit suites, backend build and available PostgreSQL integration tests. Rollback reverts the backend change; additive JSON metrics remain readable.

## Open Questions

Live latency/quality benchmarks and upstream source reliability remain deployment follow-up work, not blockers for deterministic regression verification.
