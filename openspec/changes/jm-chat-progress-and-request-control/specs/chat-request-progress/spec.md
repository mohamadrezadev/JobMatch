## ADDED Requirements

### Requirement: Present observed task and source work
The UI SHALL render meaningful stages from actual streamed or replayed events.

#### Scenario: Parallel sources
- **WHEN** one source is extracting and another is receiving pages
- **THEN** each source displays its own observed progress
- **AND** no estimated percentage or fabricated completion is shown

#### Scenario: Incomplete source
- **WHEN** a source returns an issue with a known failed stage
- **THEN** that stage and the explanation are displayed
- **AND** confirmed jobs from other sources remain visible

### Requirement: Enforce distributed request admission
The backend SHALL serialize request admission by authenticated user or guest session using PostgreSQL.

#### Scenario: Concurrent submissions
- **WHEN** separate servers receive requests for the same identity
- **THEN** only one lease can start expensive processing
- **AND** an existing authenticated run can be resumed without executing the new message

#### Scenario: Pause after a search
- **WHEN** a search completes or fails
- **THEN** its lease is released with a configurable post-search pause
- **AND** submissions during that pause return a retry time without consuming model/provider work

#### Scenario: Idempotent run replay
- **WHEN** an already accepted requestId is submitted during a pause
- **THEN** the original run is returned without another execution

#### Scenario: Worker loss and stale release
- **WHEN** a lease expires and another worker reserves it
- **THEN** release by the earlier lease ID cannot unlock the new lease

#### Scenario: Reload during a pause
- **WHEN** the client restores availability
- **THEN** it displays the remaining server-defined wait
- **AND** the draft remains editable and is not resubmitted automatically
