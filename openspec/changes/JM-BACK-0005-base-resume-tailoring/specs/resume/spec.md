## ADDED Requirements

### Requirement: Editable owned base resume
The system SHALL persist one editable base resume per authenticated owner.
#### Scenario: Save and reload
- WHEN the owner saves registered source text and skills
- THEN a base revision SHALL be persisted and restored after reload.
#### Scenario: Concurrent stale edit
- WHEN an update supplies an outdated revision
- THEN the system SHALL return 409 without replacing the newer base.

### Requirement: Independent grounded proposals
The system SHALL generate each proposal from a saved base snapshot and full target job context.
#### Scenario: Regeneration after manual edits
- WHEN the owner generates another proposal for an edited accepted resume
- THEN a separate proposal SHALL be saved
- AND the accepted resume and base SHALL remain unchanged.
#### Scenario: Invalid model output
- WHEN the model fails or returns unusable output
- THEN no accepted resume SHALL be changed.

### Requirement: Explicit idempotent acceptance
The system SHALL replace the currently accepted job resume only through explicit proposal acceptance.
#### Scenario: Accept once
- WHEN the owner accepts a proposal
- THEN it SHALL become the current per-job resume
- AND its base source snapshot SHALL be retained.
#### Scenario: Repeated acceptance
- WHEN the same proposal is accepted again after manual editing
- THEN the current document SHALL be returned without replacing its edits.
#### Scenario: Foreign proposal
- WHEN another user requests or accepts an owned proposal
- THEN the system SHALL return 404.
