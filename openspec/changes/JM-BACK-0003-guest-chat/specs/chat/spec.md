## ADDED Requirements

### Requirement: Bounded guest conversation
The API SHALL allow five successful messages per persistent guest session without authentication.

#### Scenario: Quota and reload
- WHEN a guest sends five messages and reloads
- THEN the messages and extracted context remain available
- AND a sixth message is rejected without a write.

#### Scenario: Concurrent send
- WHEN requests race with the same previous turn count
- THEN only one update commits
- AND the other receives a conflict.

#### Scenario: Invalid message
- WHEN a message is blank, oversized or has unexpected fields
- THEN input validation rejects it without consuming allowance.

### Requirement: Authenticated continuation
The API SHALL transfer guest context and messages into a conversation owned by the authenticated user.

#### Scenario: Claim and continue
- WHEN an authenticated user claims a guest transcript
- THEN ordered history and context are copied in one transaction
- AND later authenticated messages continue that conversation.

#### Scenario: Foreign owner or missing authentication
- WHEN a different owner claims an already claimed session or a caller is unauthenticated
- THEN access is denied without creating a conversation.

#### Scenario: Expired session
- WHEN a session expires
- THEN guest reads and sends are denied
- AND it is not imported into an account.
