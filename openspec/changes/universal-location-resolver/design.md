## Context

`filterAndRank` (`backend/src/modules/job-discovery/domain/discovery.ts:186-207`) matches a job's free-text `location` field against the user's requested `intent.locations` with `has(text, term) = normalizeText(text).includes(normalizeText(term))`, plus one special case: `location === "Tehran" && has(job.location!, "تهران")`. `normalizeText` already folds `ي/ك` script variants, ZWNJ and casing (`discovery.ts:61-70`), but it cannot bridge _different_ scripts/spellings of the same place (e.g. the English "Isfahan"/"Esfahan" vs Persian "اصفهان") — that bridge only exists, hardcoded, for Tehran.

The codebase already has a proven answer to this exact shape of problem: `jobs/domain/occupation-title.ts` (used by the same `filterAndRank`) resolves an occupation to a canonical family via a flat alias catalog, token matching, and no per-role `if` branches. This change applies the same pattern to locations.

## Goals / Non-Goals

**Goals:**

- Resolve a free-text location input (Persian, English, common transliterations) to a stable canonical identity, for both the user's requested location and a job's posted location.
- Match two locations by canonical identity instead of raw substring when both resolve, fixing the Isfahan/Esfahan/اصفهان class of bug and generalizing Tehran's existing fix to every catalogued city.
- Never regress matching for a place not yet in the catalog: fall back to today's exact substring behavior when either side doesn't resolve.
- Let adding a new city to the dataset require zero changes to `filterAndRank` or any other matching code.

**Non-Goals (explicitly deferred to later PRD v3.1 phases):**

- Asking the user a clarifying question when a location is ambiguous — that requires wiring into `ContextService`/chat, a separate, larger change.
- A real province→city parent/child hierarchy or `region`/`country` levels — the catalog here is flat (city- and province-name entries, no graph).
- An external geocoder fallback for places outside the static catalog (PRD §7.1 mentions this as one option; standing up a geocoder dependency needs its own validation and isn't needed to fix the reported bug).
- Any change to `JobSearchIntent`, the Goal Analyzer, or API/SSE contracts.

## Decisions

**1. A flat alias-catalog module, not a database table or external service.**
Mirrors `occupation-title.ts` exactly: a `readonly (readonly string[])[]` of alias groups (each group = one place's Persian name, English name, and known transliteration variants), a shared token-normalizer reusing `discovery.ts`'s existing `normalizeText` rules, and a lookup function — no new Prisma model, no new dependency, no network call. Alternative considered: a geocoder API (PRD §7.1 mentions this as "ترجیحاً") — rejected for this increment because it introduces an unvalidated external dependency, credentials, latency and failure modes for a problem a ~40-entry static list already solves for the sources this product targets (four Iranian job boards whose postings overwhelmingly name a provincial capital or well-known city, not an obscure village).

**2. `locationsMatch` resolves both sides and falls back to substring matching when either side is unresolved.**

```ts
function locationsMatch(requested: string, jobLocation: string): boolean {
  const goal = resolveLocation(requested);
  const job = resolveLocation(jobLocation);
  if (goal.status === "resolved" && job.status === "resolved")
    return goal.canonicalId === job.canonicalId;
  return has(jobLocation, requested); // existing substring behavior, unchanged
}
```

This is the key correctness/safety decision: it guarantees the change is strictly additive — anything that matched before (via substring) still matches when one side falls outside the catalog; anything newly fixed (cross-script matches like Esfahan/اصفهان) only applies when _both_ sides resolve to a known place, so there is no new false-positive risk from an unvalidated catalog entry on only one side.

**3. Catalog scope: Iran's provinces plus the ~40 cities most likely to appear in postings from the four approved sources, not an exhaustive national gazetteer.**
PRD §7.1 asks for "هر شهر/استان پشتیبانی‌شده توسط دیتاست مرجع" (every city/province _the reference dataset supports_) — the requirement is that support is data-driven, not that the dataset is exhaustive on day one. Starting with provincial capitals and other large cities covers the realistic test scenarios (§15: Isfahan, Shiraz, Mashhad, Tehran) and the substring fallback (decision 2) means an uncatalogued city degrades to today's behavior rather than breaking. Expanding the catalog later is a data-only change — no code change needed, satisfying the "no per-city code branch" requirement permanently, not just today.

**4. `ambiguous` status is implemented in the resolver now, even though no UI/chat consumer exists yet.**
`resolveLocation` returns `"ambiguous"` with `candidateIds` when normalized input tokens match more than one catalog entry equally well (ensuring the type and resolution logic match PRD §7.2's shape exactly, so Phase E's UI/chat work can consume it later without a resolver rewrite). In `locationsMatch`, an ambiguous resolution is treated the same as unresolved (falls back to substring) since there's no safe canonical ID to compare — the only consumer of `ambiguous` right now is the unit tests proving the mechanism works; a real-world ambiguous Iranian place name was not required to prove this, so the test uses a constructed pair of catalog entries that deliberately share a short alias.

**5. No feature flag.**
This is a strictly-safer correctness fix (decision 2's fallback guarantees no regression), not a new opt-in mode — consistent with how `unify-agent-run-budget` (the earlier PRD v3.0 increment) also shipped without a flag. PRD v3.1 §13 proposes `UNIVERSAL_LOCATION_RESOLVER_ENABLED` for the _larger_ goal-driven-agent rollout; this narrow matching fix doesn't need to wait behind that flag.

## Risks / Trade-offs

- **[Risk]** A curated ~40-city catalog will still miss smaller towns, so some locations keep today's substring-only behavior. → **[Mitigation]** This is a strict superset of current behavior (decision 2), not a regression; catalog growth is incremental and data-only.
- **[Risk]** Two real Iranian places could plausibly share a short alias and get incorrectly merged into one canonical ID instead of correctly flagged `ambiguous`, if the catalog is authored carelessly. → **[Mitigation]** Catalog entries use full city/province names as primary aliases (short-form aliases only added deliberately, mirroring `occupation-title.ts`'s own token-overlap disambiguation logic at lines 152-159 of that file); tests cover the ambiguous path explicitly.
- **[Risk]** `resolveLocation` is a pure function with no cache, called on every `filterAndRank` invocation per job. → **[Mitigation]** The catalog is small (~40-80 entries) and the lookup is a single linear scan over pre-tokenized arrays, matching the existing `occupation-title.ts` resolver's own performance profile (no caching there either, and it runs on every job in production today without issue).

## Migration Plan

No schema, API, or environment changes. New domain module plus a one-branch change inside `filterAndRank`. Deploy as a normal code change; rollback is a plain revert. Run the full `job-discovery` test suite plus the PRD's named scenarios (Isfahan, Shiraz, Mashhad, Tehran, an uncatalogued-city fallback, and an ambiguous-input case) before merging.

## Open Questions

- Should the catalog eventually move to a versioned data file (JSON) instead of a TypeScript module, to let non-engineers extend it without a code review? Deferred — not needed for this increment's scope, and `occupation-title.ts` already sets the precedent of keeping this kind of catalog in TypeScript.
