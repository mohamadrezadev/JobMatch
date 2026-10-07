## ADDED Requirements

### Requirement: Preserve compound Backend and .NET constraints
The system SHALL canonicalize recognized compound Backend/.NET titles without losing the requested technology, location, count or other constraints.

#### Scenario: Model returns the reported compound title
- **WHEN** validated model context contains `بکند دات نت`, Tehran and requestedCount ten
- **THEN** the search occupation is Backend Developer and .NET is a required skill
- **AND** count, city and candidate facts are preserved

#### Scenario: Retry uses previously stored context
- **WHEN** query generation or matching receives the same legacy compound intent
- **THEN** it uses the canonical occupation and mandatory .NET constraint
- **AND** a Tehran Backend/.NET vacancy can match

#### Scenario: Vacancy fails a constraint
- **WHEN** a candidate has a different occupation, missing .NET evidence or a different city
- **THEN** the compound-intent matcher rejects it

#### Scenario: Unknown role qualifier
- **WHEN** removing known Backend/.NET and generic developer words leaves an unknown qualifier
- **THEN** the original title is retained
- **AND** the system does not discard that qualifier to broaden eligibility

### Requirement: Prioritize Jobvision vacancy searches
The system SHALL scope Jobvision discovery queries to its vacancy path.

#### Scenario: Generate a Jobvision query
- **WHEN** a Jobvision query is generated
- **THEN** its search scope is site:jobvision.ir/jobs/
- **AND** required skills and location remain in the query

#### Scenario: External retrieval remains incomplete
- **WHEN** some sources fail while valid matching vacancies are confirmed
- **THEN** the existing partial-result contract preserves those vacancies
- **AND** the confirmed count is not represented as the requested count
