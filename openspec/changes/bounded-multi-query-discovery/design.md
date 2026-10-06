## Context

Phase 1 supplies deterministic equivalentOccupationTitles. The existing agent searches active sources concurrently once, and each provider call permits ten fetches. Both guest and authenticated flows share the agent. Existing uncommitted provider performance edits are preserved.

## Goals / Non-Goals

Goals: original-first queries; retry equivalent titles on insufficient confirmed results; shared budgets/visited URLs; immutable goal filtering; cumulative reports and cancellation.

Non-goals: semantic model generation, constraint relaxation, new sources, UI or persistence schema changes.

## Decisions

1. Build at most four deterministic query rounds from distinct normalized curated variants. Round zero includes original target titles; later rounds use the next unused equivalent for each role. Unknown titles are not repeated. The planner selects active sources for each available round; the server owns query titles and hard stopping conditions.
2. Add optional internal provider queryTitles and per-source budget options. Passing selected query titles disables automatic alias expansion for that attempt, while default standalone provider behavior stays compatible. The full original goal always reaches filtering; aliases never replace targetRoles.
3. Share ten remaining page fetches and visited canonical URLs per source across all rounds. Reserve a fetch before starting network work. Search calls remain one per selected source/round, at most sixteen total. Sources with no page budget or permanent provider prerequisite errors are excluded from subsequent rounds.
4. Snapshot previous cumulative reports at each round. Maintain attempt-local reports, then merge counts from that fixed snapshot. This avoids counting callback and returned report twice. A successful retry clears the earlier source error; unresolved failures remain partial. Accepted jobs are deduplicated across all rounds.
5. Stop after a completed concurrent batch when the goal is met, or immediately on cancellation/deadline. In-flight pages are allowed to finish within the shared deadline; no later round starts after a stopping condition. Existing source/agent events carry cumulative progress without exposing query text.

## Risks / Trade-offs

- Additional searches increase provider cost → max four rounds per source and existing ten-page total.
- First round can spend all fetches → no retry for that source; preserve the hard budget rather than silently increase it.
- A hung provider or planner can exceed a deadline → race operations against a deadline-bound signal and retain previously accepted jobs.
- Repeated redirects can point to the same detail → record canonical resolved/final URLs in the shared visited set as well as search URLs.
- Alias coverage is incomplete → unknown occupations retain one original query; semantic expansion remains future work.

## Migration Plan

No database migration or frontend deployment needed. Roll back orchestration/provider options to restore single-round behavior. Unit tests exercise real orchestration with mocked external clients; live source quality is a separate acceptance activity.

## Open Questions

No blocking questions. Tune budgets using live measurements in a later change.
