## 1. Backend

- [x] 1.1 Build deterministic original-first query rounds and explicit-title query mode.
- [x] 1.2 Add shared provider page budgets and canonical visited URL tracking.
- [x] 1.3 Implement bounded rounds, cumulative reports and deadline-safe stopping in the agent.
- [x] 1.4 Add retry, constraints, deduplication, budget, cancellation and failure recovery tests.

## 2. Frontend and Database

- [x] 2.1 Confirm existing public streams, responses, contexts and persistence need no schema changes.

## 3. Verification

- [x] 3.1 Run backend tests, TypeScript checking and formatting checks.
- [x] 3.2 Validate the change strictly and review the final diff.

## Validation Results

- Backend `pnpm exec jest --runInBand`: 31 suites, 374 tests passed.
- Backend `pnpm exec tsc --noEmit`: passed.
- Prettier checks on the changed discovery files: passed; final test edits formatted with Prettier.
- `openspec validate bounded-multi-query-discovery --strict`: passed.
- `git diff --check`: passed.
- Integration test exercises GuestDiscoveryService → AgentSearchService → NineRouter provider → normalizer → original-goal filtering with mocked external search/fetch clients.
- Tested original-first HR recovery, stop after enough jobs, salary uncertainty, shared budget exhaustion, duplicate/redirect URLs, cumulative report counting, failure recovery, immutable constraints and deadline/cancellation handling.
- Updated the chat-run ordering regression to assert understanding/persistence occur once before all four query rounds.
- Real external search quality and deployed behavior were not tested; this change is implemented locally.
