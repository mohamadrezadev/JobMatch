## ADDED Requirements

### Requirement: Owned atomic conversations

The system SHALL persist owned conversation context and messages atomically.

#### Scenario: First message

- WHEN an authenticated candidate sends a valid message without an ID
- THEN a conversation and user/assistant pair are created
- AND profile completeness is not required.

#### Scenario: Invalid request

- WHEN the message is blank, too long, or the ID is invalid
- THEN HTTP 400 is returned without writes.

#### Scenario: Foreign conversation

- WHEN a candidate reads or updates another user's ID
- THEN HTTP 404 is returned without disclosing history.

#### Scenario: Stale update

- WHEN two messages update the same context version
- THEN only one commits
- AND the other returns 409 with no partial writes.

### Requirement: Truthful incremental extraction

The system SHALL distinguish facts from preferences and require only a target role.

#### Scenario: Complete Persian request

- WHEN the candidate says «یه کار بک‌اند Node دورکار بالای ۱۵ تومن می‌خوام»
- THEN roles include Backend Developer and Node.js Developer, skills include Node.js, work type is Remote and salary is 15000000 TOMAN
- AND no extra required question is asked.

#### Scenario: Minimal role

- WHEN the candidate supplies a recognized role
- THEN the request is ready
- AND optional preferences are not invented.

#### Scenario: Correction

- WHEN work type or salary is changed
- THEN the new value replaces the old one
- AND unrelated context remains.

#### Scenario: Skill denial

- WHEN the candidate says «Python بلد نیستم»
- THEN Python is removed from positive facts and recorded as denied
- AND search preferences do not change.

#### Scenario: Project assertion

- WHEN the candidate mentions building an online shop
- THEN the original statement is retained
- AND no experience years or company history are invented.

#### Scenario: Other intent

- WHEN the candidate requests job details, feedback, resume building or career advice
- THEN the intent is classified
- AND no unimplemented operation is claimed.
