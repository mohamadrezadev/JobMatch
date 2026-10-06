## Context

ContextService and ModelContextService already accept open occupations. Authenticated and guest discovery both reach AgentSearchService and filterAndRank. The graph index predates the discovery module; current source was read directly. Existing local changes to provider fetching and persistence must be preserved.

## Goals / Non-Goals

Goals: share query/filter title equivalence, improve bilingual recall, protect occupational distinctions, keep original search context and provider budgets intact.

Non-goals: full semantic understanding of every occupation; model-generated aliases; personalized suitability; changes to database list endpoints or the UI.

## Decisions

1. Place a pure occupation-title module in the jobs domain. Curated alias groups provide deterministic equivalence and remain independent of chat, provider, Prisma and OpenAI. Derive equivalence from targetRoles at the discovery boundary instead of persisting generated titles or adding model schema fields. Both understanding modes and old conversations benefit immediately.
2. Normalize Unicode, Persian/Arabic letters, separators and case; tokenize with technology punctuation retained. Match whole tokens rather than substrings so Java/JavaScript and React/ReactQuery stay distinct. Prefer the most specific matching alias and require every remaining requested qualifier. Preserve open-title token matching for unknown occupations. Model judgment was considered but is deferred until an evaluated semantic contract exists.
3. Expand one source query using the original title and at most three alternatives per role (at most 24 total). Quote and group title alternatives; keep source restriction and required constraints outside the group. No extra provider calls or budget changes. Broad aliases are omitted from query alternatives when they carry less information than the preferred title.
4. Keep required/excluded skills, salary certainty, location, work type and experience rules in filterAndRank. Reuse the title resolver for the existing .NET technology synonym requirement. Preferred skills still affect ranking only.

## Risks / Trade-offs

- Incomplete curated coverage → unknown occupations retain conservative word matching; add evaluated alias families incrementally.
- Broad family terms → retain requested qualifier tokens and add positive/negative tests, including managerial and technology distinctions.
- Token matching is not a semantic model → translation of arbitrary qualifiers and ambiguous occupations remain future work.
- Expanded query length → cap variants and sanitize/quote all role inputs.
- Current dirty worktree → limit edits to the new domain module, discovery rules/tests and this change's documentation.

## Migration Plan

No migration or schema changes. Deploy the backend after tests; rollback the domain/query integration if necessary. Existing contexts require no backfill. Verify results from actual provider responses in a separate live acceptance exercise; unit tests cannot establish external source availability.

## Subsequent Phases

1. Bounded multi-query search when initial results are insufficient, preserving hard constraints.
2. Evaluated semantic relevance for unknown/ambiguous titles with evidence-based decisions.
3. Separate request relevance from candidate suitability using candidateFacts and existing matching, then expose reasons and targeted questions in the UI.

## Open Questions

No blocking questions for this phase. Choose additional alias families and semantic evaluation thresholds using real user requests in later changes.
