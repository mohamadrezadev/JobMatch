## ADDED Requirements

### Requirement: JobMatch branding
The frontend SHALL display the product name as جاب مچ / JobMatch and use its shared briefcase-and-check logo.

#### Scenario: Product identity
- WHEN a user opens desktop, mobile or authentication pages
- THEN the brand identifies JobMatch
- AND the browser title and favicon use the same identity.

### Requirement: Native reference design
The frontend SHALL reproduce the supplied Pathly design using native components and local assets.

#### Scenario: Desktop and mobile
- WHEN the app opens on desktop or mobile
- THEN the RTL shell and responsive navigation match the reference layout
- AND all five sections are accessible through real routes.

#### Scenario: Theme change
- WHEN the user changes the initial dark theme to light
- THEN colors update across the interface
- AND the selected theme survives reload.

### Requirement: Honest data and interactions
The frontend SHALL distinguish sample content from actual user data.

#### Scenario: Anonymous preview
- WHEN an anonymous user views sample jobs or a resume
- THEN reference content appears with a visible sample label.

#### Scenario: Authenticated job failure
- WHEN fetching real jobs fails or returns no items
- THEN a retryable error or empty state is shown
- AND no fabricated result or match score is displayed.

#### Scenario: Job filtering
- WHEN the user searches for a skill, title or company or chooses remote/hybrid
- THEN only matching cards appear
- AND selecting a card updates details.

#### Scenario: Chat send failure
- WHEN sending a message fails
- THEN the draft remains available
- AND the user sees an error.

#### Scenario: Resume editing
- WHEN a user edits their resume fields
- THEN the preview updates
- AND printed output contains only the preview.

#### Scenario: Different account
- WHEN the signed-in owner changes
- THEN the resume draft resets to that owner's source fields
- AND previous or sample credentials are not persisted into their profile.

#### Scenario: Academy answer
- WHEN a user completes a micro lesson
- THEN learning feedback appears
- AND no skill is automatically verified or added to the user's profile.
