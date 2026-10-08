## ADDED Requirements

### Requirement: Canonical location resolution

The system SHALL resolve a free-text Persian, English, or transliterated place name to a stable canonical identity using a static alias catalog, without any per-place conditional branch in matching code.

#### Scenario: Cross-script equivalence resolves to the same identity

- **WHEN** the inputs "Isfahan", "Esfahan", and "اصفهان" are each resolved
- **THEN** all three SHALL resolve to `status: "resolved"` with the same `canonicalId`

#### Scenario: Tehran resolves without a hardcoded special case

- **WHEN** the inputs "Tehran" and "تهران" are each resolved
- **THEN** both SHALL resolve to `status: "resolved"` with the same `canonicalId`, and this behavior SHALL come from the shared catalog mechanism, not a city-specific conditional

#### Scenario: Other catalogued cities resolve correctly

- **WHEN** the inputs "Shiraz"/"شیراز" and "Mashhad"/"مشهد" are each resolved
- **THEN** each pair SHALL resolve to its own shared `canonicalId`, distinct from every other catalogued place

#### Scenario: Uncatalogued input is unresolved, not guessed

- **WHEN** a place name outside the catalog is resolved
- **THEN** the result SHALL have `status: "unresolved"` and no `canonicalId`, and the system SHALL NOT substitute a different place as a guess

#### Scenario: Ambiguous input is flagged, not silently merged

- **WHEN** a normalized input matches more than one catalog entry equally well
- **THEN** the result SHALL have `status: "ambiguous"` with `candidateIds` listing the matching entries, and SHALL NOT resolve to a single `canonicalId`

### Requirement: Safe location matching with no-regression fallback

`filterAndRank` SHALL match a job's location against a requested location by resolving both through the canonical catalog when possible, and SHALL fall back to the pre-existing substring match whenever either side does not resolve, so that matching behavior for any place outside the catalog is never worse than before this change.

#### Scenario: Both sides resolved — match by canonical identity

- **WHEN** the requested location and the job's location both resolve to the same `canonicalId` (e.g., requested "Isfahan", job posting "اصفهان")
- **THEN** the job SHALL be treated as matching that location

#### Scenario: Both sides resolved to different places — no match

- **WHEN** the requested location resolves to one `canonicalId` and the job's location resolves to a different `canonicalId`
- **THEN** the job SHALL NOT be treated as matching that location

#### Scenario: Either side unresolved or ambiguous — fall back to substring matching

- **WHEN** the requested location or the job's location does not resolve to exactly one canonical identity
- **THEN** the match SHALL fall back to the existing normalized substring comparison between the raw requested text and the raw job location text, unchanged from current behavior

#### Scenario: Catalog growth requires no matching-code change

- **WHEN** a new place is added to the alias catalog
- **THEN** `filterAndRank` and `locationsMatch` SHALL require no source change to correctly match that new place
