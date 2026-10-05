## ADDED Requirements

### Requirement: Chat-first homepage
The homepage SHALL show a JobMatch landing with working chat and no sample dashboard.

#### Scenario: First visit
- WHEN an anonymous visitor opens the root or chat route
- THEN they can send a message without registration
- AND receive a backend-generated response.

#### Scenario: Former dashboard
- WHEN a visitor opens /dashboard
- THEN they are redirected to the chat-first homepage.

### Requirement: Guest conversion and continuation
The frontend SHALL prompt authentication after the guest allowance and preserve the conversation and draft.

#### Scenario: Exhaustion
- WHEN five guest messages have succeeded
- THEN login and registration actions appear
- AND an additional send is disabled without discarding text.

#### Scenario: Login or registration
- WHEN the guest authenticates in the same browser session
- THEN their guest conversation is selected in authenticated chat
- AND unsubmitted text remains editable without automatic sending.

#### Scenario: Send or import failure
- WHEN a send or history import fails
- THEN text remains available
- AND a visible error permits retry.
