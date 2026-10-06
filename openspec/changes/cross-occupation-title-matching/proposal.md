## Why

Users can request arbitrary occupations, but literal title matching misses equivalent Persian and English postings. A request for «کارشناس منابع انسانی» can lose an actual HR Specialist vacancy despite having the right job requirements.

## Problem

Search query construction and result filtering use different title rules. Software aliases cover only some roles; non-software equivalents and explicit title qualifiers need a shared policy.

## What Changes

- Introduce a shared, deterministic occupation alias resolver with Persian/English equivalents across software, accounting, sales, HR, product, design, engineering and nursing.
- Expand each source's existing search query with a bounded set of equivalent titles.
- Match equivalent titles using normalized tokens while preserving extra requested qualifiers and technology boundaries.
- Retain open-title matching for occupations outside the catalog and all existing hard constraints.

## Scope (In/Out)

In: phase 1 of broader occupation support, covering live authenticated and guest discovery through the shared discovery domain. The user's original targetRoles and candidate facts remain authoritative.

Out: model-based semantic judging, extra provider calls/retry planning, personalized suitability scores, UI explanations, new sources, and changes to database-list search. These are subsequent phases, not delivery requirements for this change.

## API Contract

No request/response or persisted conversation schema changes. targetRoles remain open strings. Discovery query expansion is derived at runtime. Existing source, deadline and page budgets remain in effect.

## Acceptance Criteria

- Persian HR, accounting, sales, engineering and design requests match curated English equivalents, and vice versa.
- Java does not match JavaScript; Data Engineer does not match Data Analyst; a requested sales manager does not become a sales specialist.
- Unknown titles still match their own title words without requiring catalog membership.
- Explicit role qualifiers, required skills, work type, city, experience and salary behavior remain enforced.
- Query terms are sanitized, deduplicated, bounded and keep required skills outside the title alternatives; preferred skills are not required.
- Existing chat contexts and requests are not mutated by alias expansion.
- Relevant tests, backend type checking and strict OpenSpec validation pass.

## Capabilities

### New Capabilities

- `occupation-title-matching`: shared title equivalence and bounded discovery query expansion.

### Modified Capabilities

None; the repository currently has no populated canonical specs to modify.

## Impact

Backend jobs domain gains a pure shared title module; job-discovery query construction and filtering consume it. No dependency, database, frontend or deployment configuration changes.
