## ADDED Requirements

### Requirement: Explain the result target
Authenticated and guest chat SHALL explain the default five-confirmed-job goal and how to request a different count. Live progress MUST display the actual server target and MUST NOT imply that the requested number is guaranteed to be available.

#### Scenario: Explicit ten jobs
- **WHEN** the server starts a discovery with targetValidJobs ten
- **THEN** live progress displays a target of ten confirmed jobs
- **AND** the generic hint explains that fewer matching vacancies may be found

#### Scenario: Default target
- **WHEN** the server starts a discovery with targetValidJobs five
- **THEN** live progress displays a target of five confirmed jobs
- **AND** the user can see an example request for ten jobs

### Requirement: Deterministic staged discovery
The system SHALL schedule the first two configured allowlisted sources with cumulative fetch ceiling three, then remaining sources with ceiling three, then all eligible sources with ceilings five, eight and ten. It MUST preserve the original goal and cap equivalent queries at four. Scheduling MUST NOT invoke the AI planner.

#### Scenario: Enough initial results
- **WHEN** the first two sources supply the requested confirmed unique jobs
- **THEN** later sources and budget waves are not started
- **AND** the model planner is not called

#### Scenario: Too few initial results
- **WHEN** initial confirmed results are below the goal
- **THEN** remaining sources and increasing budget waves are attempted
- **AND** disabled and permanently unavailable sources are excluded

### Requirement: Shared queues and fetch ceilings
The provider MUST retain unvisited URL queues across waves and prevent canonical URL refetches across queries. Search max_results SHALL follow the bounded wave ceiling. All listing, failed and detail fetches MUST share a ten-page lifetime budget per source.

#### Scenario: Listing expansion
- **WHEN** a listing yields more detail links than the initial ceiling permits
- **THEN** unvisited links survive for the next wave
- **AND** total fetch attempts never exceed ten

#### Scenario: Equivalent query repeats URLs
- **WHEN** search returns an already visited canonical URL
- **THEN** it is not fetched again
- **AND** distinct URLs remain eligible within the shared budget

### Requirement: Immediate successful stop
After each accepted unique filtered job, the system SHALL check the confirmed target, cancel outstanding work on reaching it, and ignore late callbacks. Unknown salary with a requested minimum MUST NOT count toward this target. ENOUGH_RESULTS MUST NOT become TIMEOUT or PARTIAL because unnecessary work was cancelled.

#### Scenario: Another source hangs
- **WHEN** accepted jobs reach the target while another source never completes
- **THEN** discovery returns the accepted jobs without waiting for the deadline
- **AND** completion reason is ENOUGH_RESULTS with partial false

#### Scenario: Deadline before target
- **WHEN** the deadline expires before enough confirmed jobs exist
- **THEN** previously accepted jobs and completed reports are retained
- **AND** no subsequent work starts and the result is partial

### Requirement: Internal performance evidence
The system SHALL record source stage durations and actual search/fetch/parser/AI/rejection/duplicate counts, and emit a safe aggregate summary. Existing public events MUST exclude internal diagnostics, queries, content and credentials.

#### Scenario: Measured detail extraction
- **WHEN** a detail page is fetched and parsed
- **THEN** the source report records fetch and parser timing and call counts
- **AND** public source reports retain their existing safe shape
