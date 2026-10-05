## ADDED Requirements

### Requirement: Owned server context
The API MUST authenticate the user and derive search preferences from their saved conversation.

#### Scenario: Another owner's conversation
- **WHEN** a user searches or restores another user's conversation
- **THEN** the API returns 404
- **AND** no provider request occurs.

### Requirement: Safe bounded source discovery
Discovery MUST restrict fetched URLs to configured Iranian sources and public addresses, reject unsafe redirects, and block fetch without verified provider enforcement.

#### Scenario: Foreign result
- **WHEN** search returns a LinkedIn, Indeed or private-address URL
- **THEN** the result is rejected before fetch.

#### Scenario: Unconfigured provider
- **WHEN** search is unconfigured or fetch security remains unverified
- **THEN** the API returns 503 with a specific safe code
- **AND** the conversation remains intact.

### Requirement: Honest persistent results
Discovery MUST retain only evidenced job fields, apply hard preferences, rank soft preferences and persist deduplicated postings with run reports.

#### Scenario: Partial discovery
- **WHEN** one source fails and another yields valid matching jobs
- **THEN** valid jobs are stored and returned with partial true
- **AND** missing salary/work fields remain null.

#### Scenario: Repeated discovery
- **WHEN** a posting is found again by URL or normalized identity
- **THEN** its existing job is updated instead of duplicated.

#### Scenario: Empty discovery
- **WHEN** available sources return no acceptable jobs
- **THEN** the API returns an empty list and NO_JOBS_FOUND.

### Requirement: Verified grounding continuation
Discovery MUST treat the exact Google grounding route only as transit, establish a permitted public final source before extraction, and keep listing expansion within ten total fetches per source.

#### Scenario: Listing reached through Google
- **WHEN** a verified fetch returns final_url on an allowed listing and its source links
- **THEN** only permitted detail links are followed within the existing budget
- **AND** the original Google link is never saved as the job source.

#### Scenario: Missing final destination
- **WHEN** a bridge response merely echoes the input URL
- **THEN** the page is rejected with FETCH_PROVENANCE_MISSING in its source report
- **AND** no job is extracted or invented from that response.

### Requirement: Source-evidenced Markdown extraction
The agents fallback MUST operate only on validated detail pages and retain only quoted fields present in source text.

#### Scenario: Fabricated fields
- **WHEN** extraction produces a title or company absent from the source
- **THEN** the job is rejected
- **AND** nonexistent optional fields are not retained.
