# Verification — universal-location-resolver

Date: 2026-10-08. Scope: first increment of PRD v3.1 (Phase A/B) — replace the Tehran-only location bridge with a general, data-driven resolver; no planner, roadmap UI, candidate lifecycle, or API/schema changes (those are later, separately-scoped phases).

## Completeness

All 13 tasks complete except the explicitly-out-of-scope live-provider comparison (not applicable to this change — see Delivery limits). Two added requirements implemented. Planning artifacts validated with `openspec validate universal-location-resolver`.

## Correctness

| Requirement                                        | Implementation                                                                                                                                                                                                             | Verification                                                                                                                                                                                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical location resolution                      | `domain/location-resolver.ts`: flat alias catalog (31 province/capital entries, Persian+English+transliteration aliases), `resolveLocation()`                                                                              | Isfahan/Esfahan/اصفهان, Tehran/تهران, Shiraz/شیراز, Mashhad/مشهد each resolve to one shared `canonicalId`; distinct cities get distinct IDs; uncatalogued input is `unresolved`, never guessed; a synthetic two-entry fixture proves the `ambiguous` path               |
| Safe location matching with no-regression fallback | `locationsMatch()` resolves both sides, compares canonical IDs when both resolve, else delegates to a caller-supplied fallback matcher; wired into `discovery.ts`'s `filterAndRank` in place of the old Tehran-only branch | New `discovery.spec.ts` cases: Isfahan request now matches a job posted as "اصفهان" (previously impossible); an uncatalogued city still matches/rejects via substring exactly as before; the pre-existing Tehran/تهران test passes unmodified through the new code path |

## Checks

- Backend unit (job-discovery module only): 15 suites, 253 tests passed (`npx jest src/modules/job-discovery`, backend directory) — up from 237/14 before this change (13 new resolver tests + 2 new discovery.ts integration tests).
- Backend unit (full): 38 suites, 475 tests passed (`npx jest`, backend directory).
- TypeScript: passed (`npx tsc --noEmit -p tsconfig.json`, backend directory).
- Backend build: passed (`npm run build`, backend directory — `nest build`).
- Formatting: `location-resolver.ts` and `location-resolver.spec.ts` formatted with the project's Prettier config.
- Lint: not run — no ESLint configuration file exists anywhere in `backend/` at this commit (pre-existing repository gap, documented previously in the `unify-agent-run-budget` verification; not introduced by this change).
- Frontend: untouched by this change; not re-run.
- Live-provider comparison: not applicable/not run. This change only affects local matching logic over already-extracted job data; it doesn't change what gets fetched from Jobinja/JobVision/IranTalent/E-estekhdam, so there is nothing to compare against a live baseline.

## Delivery limits

This change only fixes location _matching_ inside `filterAndRank`. It explicitly does not include, and makes no claim about:

- Asking the user a clarifying question when a requested location is ambiguous (PRD §7.1) — `locationsMatch` treats `ambiguous` the same as `unresolved` (falls back to substring) since there's no safe canonical ID to compare; surfacing this to the user requires wiring into `ContextService`/chat, a separate change.
- A real province→city parent/child hierarchy, or `region`/`country` resolution levels — the catalog is flat; a province and its capital city share one `canonicalId` rather than being linked as parent/child.
- An external geocoder fallback for places outside the static catalog — deliberately deferred (design.md decision 1) to avoid an unvalidated external dependency for this increment.
- Any change to `JobSearchIntent`, the Goal Analyzer, API routes, SSE events, or the Prisma schema — none were touched.
- Catalog coverage is Iran's 31 provinces/provincial capitals plus known transliteration variants; smaller towns not in the catalog continue to rely on the pre-existing substring match (no regression, but also no cross-script fix for them yet). Growing the catalog is a data-only change per design.md decision 3.
