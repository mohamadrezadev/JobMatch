## Why

`filterAndRank` in `discovery.ts` matches a job's location to the user's requested city with a plain substring check, plus one hardcoded bridge: `location === "Tehran" && has(job.location!, "تهران")`. Every other city only matches if the job posting happens to use the exact same script/spelling as the user's request, so a request for «فرانت‌اند در اصفهان» silently loses jobs posted as "Esfahan" or "اصفهان" written differently — the user sees a low/zero result count with no indication why. PRD v3.1 (§4, §7) calls this out as the first concrete bug class to fix before any larger goal-driven/planner work, and the team already has a proven pattern for exactly this kind of problem: `jobs/domain/occupation-title.ts`'s alias-catalog resolver, shipped in the `cross-occupation-title-matching` change.

## What Changes

- Add a new location-resolution domain module (`job-discovery/domain/location-resolver.ts`) with a curated alias catalog of major Iranian provinces/cities (Persian, English, and common transliteration variants) and a stable canonical ID per place, mirroring the existing occupation-title alias-catalog pattern — no per-city `if` branches.
- Add `resolveLocation(input): LocationResolution` (resolved / ambiguous / unresolved) and `locationsMatch(goalLocation, jobLocation): boolean`.
- Replace the single Tehran-only bridge in `discovery.ts`'s `filterAndRank` with a call to `locationsMatch`, which resolves both sides through the same catalog when possible and **falls back to the existing plain substring match** when either side isn't in the catalog yet — so matching for places outside the curated list never regresses below today's behavior.
- No change to the public API, SSE events, Prisma schema, or feature flags: this is a correctness fix to existing matching logic, not a new opt-in mode.

## Capabilities

### New Capabilities

- `location-resolver`: resolves free-text Persian/English/transliterated place names to a stable canonical identity, and matches a job's location against a user's requested location using that identity instead of raw string comparison.

### Modified Capabilities

(none — no `openspec/specs/` entries exist for job-discovery yet; this is a new capability, not a change to an approved spec's requirements)

## Impact

- `backend/src/modules/job-discovery/domain/location-resolver.ts` — new file (catalog + resolve + match functions).
- `backend/src/modules/job-discovery/domain/discovery.ts` — `filterAndRank`'s location branch calls `locationsMatch` instead of the inline `has(...) || (location === "Tehran" && ...)` check.
- Tests: new `location-resolver.spec.ts`; `discovery.spec.ts` gains cases for Isfahan/Esfahan/اصفهان, Shiraz/شیراز, Mashhad/مشهد, an ambiguous-input case, and a not-yet-catalogued city falling back to substring matching.
- Out of scope for this change (left for later PRD v3.1 phases): asking the user a clarifying question when a location is ambiguous, province/region hierarchy and parent/child relationships, an external geocoder fallback, and any change to `JobSearchIntent`/`SearchGoal` shape or the Goal Analyzer. This increment only fixes matching inside `discovery.ts`.
