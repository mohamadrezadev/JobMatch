## ADDED Requirements

### Requirement: Original-first bounded query rounds

The agent SHALL search original target titles first and schedule distinct curated equivalents only while confirmed unique jobs are below the requested goal. It MUST preserve the original goal for filtering and planner inputs.

#### Scenario: HR equivalents recover results
- **WHEN** the original Persian HR query returns insufficient results
- **THEN** HR Specialist and Human Resources Specialist are attempted in separate subsequent rounds
- **AND** a validated equivalent title is filtered against the original Persian request

#### Scenario: Sufficient original results
- **WHEN** the original round supplies enough unique salary-confirmed jobs
- **THEN** no equivalent round is started

#### Scenario: Unknown title
- **WHEN** an occupation has no curated equivalents
- **THEN** it is searched once without inventing a new occupation

### Requirement: Shared resource limits

The system SHALL enforce at most four rounds, at most four active sources per round and ten page fetches per source across the entire run. Visited canonical URLs MUST be shared across attempts. Disabled sources and permanent unavailable/security prerequisites MUST NOT be retried.

#### Scenario: Budget consumed in first attempt
- **WHEN** a source uses all ten page fetches
- **THEN** no subsequent search is issued for that source

#### Scenario: Repeated result URL
- **WHEN** a later equivalent query returns a URL already visited
- **THEN** that URL is not fetched again
- **AND** a distinct new URL can still be evaluated within the remaining budget

#### Scenario: Permanent provider failure
- **WHEN** a required search/fetch provider or verified fetch policy is unavailable
- **THEN** the error is returned without alias retries

### Requirement: Constraints and accumulated progress

Every attempt MUST preserve required/excluded skills, work type, city, explicit experience, company exclusions and salary filtering. The agent SHALL deduplicate jobs and aggregate attempt counts into one report per source without double-counting callback/return reports.

#### Scenario: Salary uncertain result
- **WHEN** a salary minimum was requested and a relevant posting has unknown salary
- **THEN** it remains visible with existing uncertainty behavior
- **AND** it does not stop further available query rounds

#### Scenario: Later successful retry
- **WHEN** an earlier source search fails and a later attempt succeeds
- **THEN** cumulative counts include both attempts
- **AND** the recovered source error is cleared

### Requirement: Deadline and accepted result preservation

The agent SHALL stop starting work on deadline/cancellation and MUST retain accepted jobs and completed source reports when later work fails or never resolves.

#### Scenario: Hung later attempt
- **WHEN** a retry never completes before the shared deadline
- **THEN** the search completes with partial results already accepted
- **AND** no further round is issued

#### Scenario: Cancellation during planning
- **WHEN** cancellation or the deadline occurs while planning
- **THEN** no provider call starts afterward
