## ADDED Requirements

### Requirement: Honest accessible loading feedback
Pages SHALL show a consistent operation-specific loading state while actual work is pending, with reduced-motion support and no fabricated progress.

#### Scenario: Initial data is pending
- **WHEN** profile, settings, resume, dashboard, chat or jobs data is being received
- **THEN** a relevant status and noninteractive skeleton are displayed
- **AND** initial editable account forms are hidden until stored data is received

#### Scenario: Slow response
- **WHEN** a loading state remains mounted for ten seconds
- **THEN** its explanation says the response has not arrived
- **AND** it does not display invented completion percentages or milestones

#### Scenario: Request completes or fails
- **WHEN** the underlying request settles
- **THEN** its loading state is removed and content or the existing error/retry state is shown

### Requirement: Operation-aware action feedback
Busy actions SHALL prevent repeated submissions and identify their actual operation.

#### Scenario: Save account or generate a resume
- **WHEN** a user submits an operation
- **THEN** the relevant button or compact status shows activity and repeated submissions are disabled
- **AND** resume feedback distinguishes saving, proposal generation, acceptance and PDF download

#### Scenario: Discovery completes
- **WHEN** a streamed discovery run is active
- **THEN** activity indicators accompany actual streamed stages
- **AND** ongoing indicators stop once the run finishes
