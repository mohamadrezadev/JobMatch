## Why

One combined title query can return too few relevant vacancies. Equivalent titles must be searched separately when confirmed results are insufficient, while preserving user constraints and existing resource limits.

## Problem

AgentSearchService marks sources exhausted after one search. Provider fetching resets its page budget on every call, so simply retrying would increase work and refetch duplicate pages.

## What Changes

- Search original target titles first, then distinct curated equivalent titles in subsequent rounds.
- Keep active sources concurrent within each round and stop between rounds when enough salary-confirmed jobs exist.
- Share each source's ten-page fetch budget and visited URLs across rounds; cap rounds at four.
- Aggregate source counts across attempts without double-counting completed callbacks and returned reports.
- Preserve original filtering, live accepted jobs, cancellation, allowlists and cache behavior.

## Scope (In/Out)

In: backend authenticated/guest discovery, deterministic query rounds, budgets, cumulative reports, regression tests.

Out: new sources, generated semantic titles, relaxation of constraints, UI changes, candidate suitability scoring, deployment.

## API Contract

Public request/response and stream event shapes remain compatible. Internal provider options add queryTitles and shared source budgets. Progress uses existing step and source events; public source reports remain cumulative, one per source. Original context and persisted targetRoles are unchanged.

## Acceptance Criteria

- HR searches begin with the requested title, then HR Specialist/Human Resources Specialist when results are insufficient.
- Enough confirmed unique results stop later rounds; unknown salary does not count toward a salary-constrained goal.
- Unknown titles have one attempt; duplicate equivalent queries are never scheduled.
- At most four rounds, 16 source searches across four sources, and ten fetches per source across the whole run.
- Required skills, work type, city, experience, excluded companies/skills and salary rules remain authoritative.
- Repeated page URLs are not refetched; accepted jobs survive later failures/timeouts.
- Disabled sources and global unavailable/security prerequisites are not retried.
- All applicable tests, backend type checking and strict change validation pass.

## Capabilities

### New Capabilities

- `bounded-multi-query-discovery`: immutable-goal query rounds with shared fetch budgets and cumulative progress.

### Modified Capabilities

None; the earlier occupation-title change remains separate and supplies curated equivalents.

## Impact

Discovery domain query builder, agent search orchestration, provider port/fetch loop and related tests. No new dependency, migration or frontend contract change.
