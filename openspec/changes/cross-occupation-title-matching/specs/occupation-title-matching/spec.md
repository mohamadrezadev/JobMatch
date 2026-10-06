## ADDED Requirements

### Requirement: Shared bilingual title equivalence

Discovery SHALL use one deterministic alias policy for search query expansion and title acceptance. It MUST preserve original targetRoles and candidate facts.

#### Scenario: Persian occupation with English posting
- **WHEN** a user requests «کارشناس منابع انسانی» and a validated posting is titled HR Specialist
- **THEN** the source query includes an equivalent English title
- **AND** the posting passes the title filter without changing the user's context

#### Scenario: Several occupational families
- **WHEN** equivalent titles are encountered in accounting, sales, HR, product, design, engineering, nursing or software
- **THEN** curated Persian and English titles match in both directions
- **AND** unrelated occupations remain excluded

### Requirement: Conservative occupational boundaries

Title matching SHALL use normalized tokens, choose the most specific recognized alias, and require remaining requested qualifiers. Unknown occupations MUST remain supported through their own title tokens.

#### Scenario: Similar but different technology
- **WHEN** Java Developer is requested and the posting title is JavaScript Developer
- **THEN** the posting fails the title filter

#### Scenario: Explicit qualifier
- **WHEN** «حسابدار مالیاتی» is requested
- **THEN** «حسابدار مالیاتی ارشد» passes
- **AND** «حسابدار» fails

#### Scenario: Distinct occupational responsibility
- **WHEN** Sales Manager or Data Engineer is requested
- **THEN** Sales Specialist or Data Analyst respectively fails the title filter

#### Scenario: Unknown occupation
- **WHEN** Medical Device Technician is requested
- **THEN** Medical Device Service Technician passes
- **AND** Medical Sales Representative fails without needing a catalog entry

### Requirement: Bounded search expansion

The system SHALL generate one query per selected source with at most four variants per role and 24 total unique title terms. It MUST sanitize and quote title inputs and keep required skills and existing work/location terms outside title alternatives.

#### Scenario: Query preserves hard requirements
- **WHEN** Backend with required .NET and preferred Node.js is requested
- **THEN** equivalent Backend titles are grouped in the query
- **AND** .NET remains a required term and Node.js is not inserted as a requirement

#### Scenario: Invalid query control text
- **WHEN** a role contains quotes, line breaks or site/inurl/intitle directives
- **THEN** these cannot add a new source restriction or escape the quoted title
- **AND** duplicate or excess title alternatives are omitted

### Requirement: Existing discovery constraints remain authoritative

Alias acceptance MUST NOT bypass work type, city, explicit experience, required/excluded skills, company exclusions, salary rules or deduplication. The same rules SHALL apply to authenticated and guest discovery.

#### Scenario: Relevant title with incompatible work type
- **WHEN** an equivalent title is found but the posting is OnSite and Remote was required
- **THEN** the posting is rejected

#### Scenario: Unknown salary
- **WHEN** an equivalent title matches and salary is unknown despite a requested minimum
- **THEN** existing uncertain-salary visibility and salary confirmation behavior are retained
