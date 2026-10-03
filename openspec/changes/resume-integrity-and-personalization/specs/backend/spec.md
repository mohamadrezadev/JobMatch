## ADDED Requirements

### Requirement: Resume integrity guard MUST prevent fabricated claims
After the LLM generates resume content, the `ResumeIntegrityGuard` SHALL cross-check every field (summary, skills list, work experience bullet points, project descriptions) against verified source data from the user's `Profile`, `UserSkill`, and historical employment records stored in Prisma. Any claim that cannot be traced to verified data SHALL be removed or replaced with a placeholder string `"Verified: [field name]"`.

#### Scenario: LLM hallucinates a skill
- **GIVEN** the LLM outputs a resume containing "Expert in Kubernetes"
- **GIVEN** the user's `UserSkill` list does NOT contain Kubernetes
- **WHEN** the integrity guard processes the resume
- **THEN** the line "Expert in Kubernetes" SHALL be stripped or replaced with the placeholder; no fabricated skill SHALL appear in the returned resume

#### Scenario: LLM stays within verified data
- **GIVEN** the user has C#, .NET, and ASP.NET Core as verified skills
- **WHEN** the LLM outputs those three skills in the resume
- **THEN** all three SHALL pass the integrity check and remain in the final output

---

### Requirement: Integrity violations MUST be logged
Every time the guard removes or modifies a claim, the system SHALL write a structured log entry containing `userId`, `jobId`, `field`, `original_value`, `action` (stripped/replaced), and `timestamp`. Logs SHALL NOT be exposed in the API response.

#### Scenario: violation logged
- **GIVEN** the guard strips a fabricated claim
- **WHEN** processing completes
- **THEN** a log entry SHALL exist in the application logs with the violation details; the API response SHALL remain clean

---

### Requirement: Feedback MUST influence recommendation ranking
`GET /api/jobs/recommended` SHALL adjust the sort order based on the authenticated user's `JobFeedback` history. An "Interested" rating SHALL apply a positive rank modifier for jobs sharing the same technology category. A "Not Interested" rating with reason "Technology" SHALL apply a negative modifier for that specific technology.

#### Scenario: interested feedback boosts matching tech
- **GIVEN** the user previously rated a .NET job as "Interested"
- **WHEN** `GET /api/jobs/recommended` is called
- **THEN** other .NET jobs SHALL receive a slight rank boost compared to jobs in unrelated categories

#### Scenario: not-interested with technology reason demotes
- **GIVEN** the user previously rated a Flutter job as "Not Interested" with reason "Technology"
- **WHEN** `GET /api/jobs/recommended` is called
- **THEN** Flutter jobs SHALL receive a small rank penalty

---

### Requirement: Personalization activation MUST require minimum feedback count
The feedback-driven re-ranking SHALL only activate once the user has submitted at least 3 `JobFeedback` entries. Below this threshold, recommendations SHALL use the base matching score only.

#### Scenario: below threshold uses base score
- **GIVEN** a user with only 1 feedback entry
- **WHEN** `GET /api/jobs/recommended` is called
- **THEN** the response SHALL reflect only the raw match scores without any feedback-based adjustment

#### Scenario: above threshold enables personalization
- **GIVEN** a user with 5 feedback entries
- **WHEN** `GET /api/jobs/recommended` is called
- **THEN** the response SHALL include feedback-modified rankings

---

### Requirement: Recommendation rank modifier MUST be bounded and additive
The feedback-derived modifier SHALL be a small percentage adjustment (±15% maximum) added to the base match score. It SHALL never override the base score sign — a low-match job SHALL remain low-ranked even after personalization boosts.

#### Scenario: modifier capped at 15%
- **GIVEN** a job with base match score 40% and a strong feedback bonus
- **WHEN** the recommendation is calculated
- **THEN** the final score SHALL be 55% (40 + 15 cap), not exceeding the 55% floor
