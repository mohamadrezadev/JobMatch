## ADDED Requirements

### Requirement: Accessible chat

The frontend SHALL expose authenticated chat without a profile completeness requirement.

#### Scenario: Send

- WHEN a candidate submits a valid draft
- THEN history and readiness update from server data
- AND the draft clears after success only.

#### Scenario: Failure

- WHEN sending fails
- THEN an accessible error is shown
- AND the draft is retained for retry.

#### Scenario: Restore

- WHEN a candidate selects an owned conversation after reload
- THEN persisted messages and context appear.

#### Scenario: Sign out

- WHEN authentication ends
- THEN chat state clears and the page redirects to login.

#### Scenario: Role only

- WHEN context includes a role without salary or work type
- THEN readiness is displayed without mandatory follow-up fields.
