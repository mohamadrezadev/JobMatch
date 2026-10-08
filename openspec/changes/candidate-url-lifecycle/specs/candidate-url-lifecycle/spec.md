## ADDED Requirements

### Requirement: Per-URL lifecycle persistence

For every URL a discovery run processes, the system SHALL persist one record keyed by run and canonical URL, carrying its source, final status, error code when applicable, last attempted time, retry count, and the pipeline stage reached. Persisting this record SHALL NOT be awaited inside the per-URL discovery loop, so a persistence failure or delay never changes discovery's behavior or timing.

#### Scenario: A successfully matched job is recorded

- **WHEN** a URL is fetched, extracted, and accepted by the goal's hard constraints
- **THEN** its persisted record SHALL have `status: "MATCHED"`

#### Scenario: A fetch failure is recorded with the existing error code

- **WHEN** fetching a URL fails (timeout, HTTP error, or provider error)
- **THEN** its persisted record SHALL have `status: "FAILED"` and an `errorCode` equal to the same code the discovery pipeline already assigns for that failure today

#### Scenario: A duplicate URL is recorded, not silently dropped

- **WHEN** a URL already seen earlier in the same run is encountered again
- **THEN** its persisted record SHALL have `status: "REJECTED"` with `errorCode: "DUPLICATE"`, and SHALL NOT be re-fetched

#### Scenario: A URL cut short by the run deadline is marked timed out, not left looking complete

- **WHEN** the run's abort signal fires while a URL is mid-flight (fetched but not yet extracted, or queued but never attempted)
- **THEN** its persisted record SHALL have `status: "TIMED_OUT"`, never a status implying the URL was fully processed

#### Scenario: Persistence failure does not affect discovery

- **WHEN** the candidate-recording write fails or is slow
- **THEN** the discovery run SHALL proceed and complete exactly as it would without this capability

### Requirement: Paginated, owner-scoped candidate listing

The system SHALL expose a paginated endpoint that lists a run's candidate URLs, filterable by status, restricted to the run's owning user, and SHALL NOT include any URL that was not already subject to the existing source allowlist/validator checks.

#### Scenario: Only the owning user can list a run's candidates

- **WHEN** a user requests the candidate list for a run they do not own
- **THEN** the request SHALL be rejected the same way an unowned run lookup is rejected today

#### Scenario: Results are paginated and filterable

- **WHEN** a client requests candidates with a `status` filter, a `cursor`, and a `limit`
- **THEN** the response SHALL return only matching records, bounded by `limit`, with a cursor usable to fetch the next page

#### Scenario: No unvalidated URL is ever exposed

- **WHEN** candidate records are returned
- **THEN** every `canonicalUrl` in the response SHALL be one that already passed through the existing `SourceValidator` checks during discovery, never raw unvalidated input
