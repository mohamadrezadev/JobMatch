## 1. Catalog and resolver

- [x] 1.1 Create `backend/src/modules/job-discovery/domain/location-resolver.ts` with a flat alias catalog (readonly array of alias groups) covering Iran's provinces and the major cities most likely to appear in postings from the four approved sources, each group tagged with a stable `canonicalId`.
- [x] 1.2 Implement a token normalizer reusing the same script-folding rules as `discovery.ts`'s `normalizeText` (ی/ك/ZWNJ/casing), mirroring `occupation-title.ts`'s `titleTokens` approach.
- [x] 1.3 Implement `resolveLocation(input: string): LocationResolution` returning `status: "resolved" | "ambiguous" | "unresolved"`, `canonicalId`/`canonicalNameFa`/`canonicalNameEn` when resolved, and `candidateIds` when ambiguous.
- [x] 1.4 Implement `locationsMatch(requested, jobLocation, fallbackMatch)` per design.md decision 2 — resolves both sides and compares canonical IDs, else delegates to a caller-supplied fallback matcher (dependency injection instead of importing `discovery.ts`'s `has`, to keep this module dependency-free like `occupation-title.ts` and avoid a circular import).
- [x] 1.5 Added a synthetic two-entry catalog fixture in the test file (not the production catalog) to exercise the `ambiguous` path deterministically, avoiding a fabricated collision in real Iranian geographic data.

## 2. Integration into discovery.ts

- [x] 2.1 Replaced the inline `has(job.location!, location) || (location === "Tehran" && has(job.location!, "تهران"))` branch in `filterAndRank` with `locationsMatch(location, job.location!, has)`.
- [x] 2.2 Confirmed no other behavior in `filterAndRank` changed: full `discovery.spec.ts` suite (42 tests, including role, work-type, salary, excluded-company and ranking cases) passes unmodified except for the two new location tests added.

## 3. Tests

- [x] 3.1 `location-resolver.spec.ts` (13 tests): Isfahan/Esfahan/اصفهان share a canonicalId; Tehran/تهران share a canonicalId; Shiraz/شیراز and Mashhad/مشهد each resolve distinctly; an uncatalogued input is `unresolved`; the synthetic ambiguous pair resolves to `ambiguous` with both candidateIds; `locationsMatch` covered for matched/mismatched/fallback cases.
- [x] 3.2 `discovery.spec.ts`: added "matches a job location across scripts via the location resolver" (Isfahan request matches a job posted as اصفهان; rejects a Shiraz job) and "falls back to substring matching for a city outside the resolver's catalog" (uncatalogued city still matches/rejects exactly as before).
- [x] 3.3 Full `job-discovery` suite run: 15 suites, 253 tests passed, including the pre-existing Tehran/تهران test which now runs through the new resolver path with no change in outcome.

## 4. Verification

- [x] 4.1 `npx jest src/modules/job-discovery` (backend): 15 suites, 253 tests passed.
- [x] 4.2 `npx tsc --noEmit` (backend): clean.
- [x] 4.3 `npm run build` (backend): compiles successfully (`nest build`).
- [x] 4.4 Results recorded in `verification.md`, including catalog scope (31 provinces/capitals) and explicitly deferred items (ambiguity clarification UI, geocoder fallback, province/city hierarchy).
