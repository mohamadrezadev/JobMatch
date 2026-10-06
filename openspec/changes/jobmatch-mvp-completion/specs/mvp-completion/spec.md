## ADDED Requirements

### Requirement: Atomic onboarding and account restoration
The system SHALL persist names, role, experience, skills and preferences in one transaction and SHALL restore completion from the backend for the current account.

#### Scenario: Complete onboarding
- **WHEN** a user submits valid onboarding with OnSite work type and at least one skill
- **THEN** all fields persist and completion becomes true
- **AND** the user enters career chat.

#### Scenario: Failed skill write
- **WHEN** a skill write fails during completion
- **THEN** the transaction rolls back
- **AND** the UI reports failure without marking the account complete.

### Requirement: Backend filtering and explainable matching
The system SHALL filter before pagination, bound query sizes, provide accurate totals and return separate skills, experience, location, work type and salary components with unknown states.

#### Scenario: Search outside initial page
- **WHEN** a user filters location, work type, skills and minimum salary
- **THEN** the entire stored job collection is queried before pagination
- **AND** unknown salaries do not satisfy an explicit minimum.

#### Scenario: Invalid pagination
- **WHEN** page is negative or pageSize exceeds 100
- **THEN** the API returns validation error.

#### Scenario: Unknown job data
- **WHEN** job salary or seniority is unspecified
- **THEN** the component is labelled unknown
- **AND** the system does not claim full compatibility.

### Requirement: Feedback-aware ranking
The system SHALL persist interest/rejection, require a rejection reason and apply bounded personalization after three distinct job feedbacks, using latest decisions and keeping ranking separate from match score.

#### Scenario: Feedback threshold
- **WHEN** fewer than three distinct jobs have feedback
- **THEN** recommendations use base match score only.

#### Scenario: Work type rejection
- **WHEN** sufficient feedback includes rejection for work type
- **THEN** similar work types receive a penalty capped within ±15% of base
- **AND** technology is not penalized for unrelated rejection reasons.

### Requirement: Real dashboard and persisted settings
The system SHALL provide one authenticated aggregate dashboard and expose only settings with backend persistence. Academy SHALL be absent from active navigation.

#### Scenario: Fresh account
- **WHEN** an account has no discoveries or resumes
- **THEN** dashboard shows actual zero counts and actionable empty states
- **AND** settings can persist work type and salary.

### Requirement: Owned truthful resumes and actual PDF
The system SHALL allow list, restoration, editing and PDF download of owned resumes. Every generated factual block SHALL originate from registered user input, and unsupported claims SHALL be removed and logged before persistence or display.

#### Scenario: Fabricated model content
- **WHEN** AI returns an invented company, skill, degree, title, years or achievement
- **THEN** unsupported content is dropped or replaced with registered factual blocks
- **AND** a structured violation is logged.

#### Scenario: Resume refresh and download
- **WHEN** a user saves a resume, refreshes and downloads
- **THEN** the stored content is restored
- **AND** the server returns a searchable application/pdf file for that version.

#### Scenario: Another user's resume
- **WHEN** a user requests or edits a resume owned by another account
- **THEN** the API returns not found and exposes no content.

### Requirement: Existing chat and measurable flow
The system SHALL preserve Persian follow-up context, run/event recovery, valid partial provider results and SHALL persist constrained funnel events.

#### Scenario: Interrupted browser
- **WHEN** a user refreshes during an existing chat run
- **THEN** persisted run events can be recovered without duplicating the committed turn.

#### Scenario: One source fails
- **WHEN** some sources fail and others return valid jobs
- **THEN** valid results remain visible with partial status.

#### Scenario: User action event
- **WHEN** a user views a job, generates/downloads a resume or opens the original source
- **THEN** a validated event records the account and relevant resource identifier.
