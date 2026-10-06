## Context

See `docs/mvp-gap-analysis.md` for source-verified baseline. Existing chat and discovery have 152 passing backend tests and the frontend has 43 passing tests. Integration must keep persisted run/event recovery and provider partial results.

## Goals / Non-Goals

Goals: complete the real-data user journey, enforce ownership, atomic completion, server filtering and truthful resume generation.

Non-goals: Academy, payments, employer tools, notification delivery, automatic applications, external verification of self-reported career history.

## Decisions

- Reuse Nest modules and Prisma; additive profile factual blocks and analytics model. Atomic onboarding transaction saves user names, profile and skills together. Partial profile edits do not mark an incomplete account complete.
- A pure matching function consumes loaded profile/skills/job, shared by matching endpoints and recommendations. Unknown fields score neutral 50 and expose status. Rank is separate from fit; latest feedback per distinct job activates personalization at three jobs with ±15% cap.
- Prisma applies search filters before pagination and count. Text search is case insensitive, page sizes bounded, skills filter normalized. Retain legacy POST search.
- Resume guard reconstructs a whitelist of source-backed fields. AI selects/reorders exact registered summary/highlight blocks and skills; unsupported prose and unexpected experience/education fields never pass. User edits are clearly self-reported and checked for identity and registered skills. No second model is trusted as a factual verifier.
- Render PDFs with the installed react-pdf package and locally bundled Vazirmatn font. Binary endpoints bypass JSON envelope. Save PDF path per resume/version; invalidate on edit. Keep job-based routes and add id-based plural routes.
- Dashboard aggregates owned counts and recent records in one HTTP request. Preferences reuse profile fields; notification switches remain absent until delivery exists.
- Funnel events use a constrained enum and resource IDs, not arbitrary text/profile data. Backend authoritative events plus user interaction events are persisted.

## Risks / Trade-offs

- Conservative resume wording limits AI rewriting → explain source-backed selection; allow explicit user edits.
- Full ranking can be costly at large scale → document MVP scale, avoid per-job profile/skills queries; later precompute scores.
- Sources/AI/database unavailable → controlled errors, no demo fallbacks, preserve existing partial results.
- Self-reported blocks are not independently verified → label the trust boundary and do not claim external verification.

## Migration Plan

Add nullable/defaulted profile fields and analytics table with foreign key. Generate Prisma client and validate schema. Apply versioned migration to PostgreSQL before live smoke. Existing records remain compatible. Roll back application first; retain additive data rather than destructive rollback.

## Open Questions

Production provider credentials/availability and numerical funnel targets require release evidence. They do not block local implementation or mocked verification.
