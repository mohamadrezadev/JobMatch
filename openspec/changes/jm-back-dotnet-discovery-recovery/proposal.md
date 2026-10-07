# Recover compound Backend/.NET discovery

## Problem
The reported request for ten Backend/.NET vacancies in Tehran stored the literal role `بکند دات نت`. Although count and location were correct, model context bypassed the deterministic role/technology split. Searches quoted the compound phrase and legitimate titles failed occupation matching. The recorded run confirmed zero jobs; Jobvision also spent time extracting unsuitable pages.

## Scope (In/Out)
In: normalize recognized Backend/.NET compound titles into occupation plus required technology, including model context and previously stored search intents; prioritize Jobvision vacancy pages in search queries; regression and real-provider verification.

Out: upstream retrieval repairs, new sources, database migration, deadline increases, relaxing eligibility checks, or guaranteeing ten available vacancies.

## API Contract
No API or database changes. Preserve requestedCount, locations, candidate facts and all other search conditions. The existing partial-result and streaming contracts continue to apply.

## Acceptance Criteria
- The reported compound title becomes Backend Developer with required .NET, preserving ten and Tehran.
- Legacy stored intents receive the same query and matching behavior.
- Wrong technologies, occupations and locations remain excluded.
- Unknown role qualifiers are retained rather than silently discarded.
- Jobvision queries prioritize its /jobs/ pages; existing provenance and expired-posting checks remain enforced.
- Record actual live results and remaining source failures without claiming the requested count was achieved.
