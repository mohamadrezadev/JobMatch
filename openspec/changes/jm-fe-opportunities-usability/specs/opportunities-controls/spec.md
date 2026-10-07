## ADDED Requirements

### Requirement: Explicit understandable filters
The opportunities page SHALL separate city and work type, label every field, keep advanced filters collapsible and apply only submitted drafts.

#### Scenario: Apply filters from another page
- **WHEN** the user edits filters while viewing page two and submits
- **THEN** one search request uses the submitted filters with page one
- **AND** typing before submission sends no search requests

#### Scenario: Clear an active filter
- **WHEN** the user removes an active filter chip
- **THEN** that filter is removed and remaining applied filters are retained
- **AND** clear all removes every filter and returns to page one

### Requirement: Accessible pagination and result states
The opportunities page SHALL place pagination beneath its list with numbered shortcuts, current page semantics and unavailable controls disabled.

#### Scenario: Navigate results
- **WHEN** the user chooses a page
- **THEN** the corresponding search is requested and list focus is restored
- **AND** navigation is disabled until loading completes

#### Scenario: Navigation fails
- **WHEN** the requested page cannot be loaded
- **THEN** a retry action is shown instead of stale results or an empty-result claim
- **AND** retry requests the failed page again

#### Scenario: No matches
- **WHEN** filtering returns no matches
- **THEN** the user sees an empty-result explanation and actions to reset filters or search with the assistant
