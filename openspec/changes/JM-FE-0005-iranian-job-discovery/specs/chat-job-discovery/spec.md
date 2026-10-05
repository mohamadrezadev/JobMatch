## ADDED Requirements

### Requirement: Actionable authenticated discovery
Ready authenticated search turns MUST initiate discovery and display persisted jobs in chat.

#### Scenario: Ready turn
- **WHEN** an authenticated search reply is ready
- **THEN** discovery runs once for that trigger
- **AND** cards offer persisted details and original source links.

### Requirement: Honest independent search states
Discovery MUST preserve the transcript and distinguish unavailable, partial and empty states.

#### Scenario: Provider failure
- **WHEN** discovery is unavailable
- **THEN** a recoverable message appears
- **AND** no sample jobs replace results or discard chat.

#### Scenario: Changed owner
- **WHEN** an earlier request finishes after changing owner or conversation
- **THEN** its results are ignored.

### Requirement: Guest registration gate
Guests MUST receive a registration/login invitation before real job discovery.

#### Scenario: Guest ready preferences
- **WHEN** a guest specifies a target role
- **THEN** the chat offers registration/login and preserves the conversation
- **AND** the remaining guest allowance still works.
