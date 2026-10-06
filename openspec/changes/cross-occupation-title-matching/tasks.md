## 1. Backend

- [x] 1.1 Add a shared pure bilingual title resolver with token boundaries, qualifier preservation and open-title fallback.
- [x] 1.2 Integrate bounded equivalent titles into the existing source query and shared discovery title filter.
- [x] 1.3 Add bilingual positive/negative cases and regression tests for hard constraints and immutable contexts.

## 2. Frontend and Database

- [x] 2.1 Confirm phase 1 requires no frontend, conversation schema or database migration changes.

## 3. Verification

- [x] 3.1 Run relevant discovery/chat tests and backend type checking; record results.
- [x] 3.2 Validate the OpenSpec change strictly and review the final diff against the specification.

## Validation Results

- `pnpm exec jest --runInBand` (backend): 31 suites and 358 tests passed.
- `pnpm exec tsc --noEmit` (backend): passed.
- `openspec validate cross-occupation-title-matching --strict`: passed.
- `git diff --check`: passed.
- Reviewed title family boundaries, original context preservation, bounded query expansion and hard constraint regressions.
- Live provider availability and search recall were not measured in this change; verification uses deterministic rules and mocked provider flows.
