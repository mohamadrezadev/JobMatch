## 1. Resume Integrity Guard

- [ ] 1.1 Create `backend/src/common/integrity-checker.ts` — a service that receives generated resume content (JSON) and the user's verified data (`UserSkill[]`, `Profile`, employment history)
- [ ] 1.2 Implement skill verification: every skill mentioned in the resume SHALL exist in `UserSkill`; unverified skills SHALL be stripped and replaced with `"Verified: [skill name]"`
- [ ] 1.3 Implement experience verification: work experience bullet points SHALL only reference companies and roles present in the user's `Profile` or historically submitted data; unverifiable claims SHALL be replaced with placeholder text
- [ ] 1.4 Integrate the guard into `resume.service.ts` as a post-processing step called after the OpenAI response is received but before the resume is stored or returned
- [ ] 1.5 Write structured log entry on every violation — include `userId`, `jobId`, `field`, `original_value`, `action` (stripped/replaced), `timestamp`

## 2. Feedback-Driven Recommendation

- [ ] 2.1 Read all `JobFeedback` entries for the authenticated user from Prisma in `jobs.service.ts` `recommended()` method
- [ ] 2.2 Implement positive modifier: +10% rank score for jobs whose `requiredSkills` overlap with a skill from a previously "Interested" rated job
- [ ] 2.3 Implement negative modifier: -5% rank score for jobs sharing a technology category with a "Not Interested → Technology" feedback entry
- [ ] 2.4 Apply modifiers AFTER base match scores are computed; cap total modifier at ±15% of base score
- [ ] 2.5 Skip personalization entirely if the user has fewer than 3 feedback entries — return base-score-ordered results

## 3. Tests

- [ ] 3.1 Add unit test for integrity guard: LLM returns fabricated skill "Kubernetes"; verify it is stripped from output
- [ ] 3.2 Add unit test for integrity guard: LLM returns only verified skills; verify all pass through unchanged
- [ ] 3.3 Add unit test for recommendation personalization: user has 5 feedback entries including one "Interested" for .NET; verify .NET jobs rank higher
- [ ] 3.4 Add unit test for recommendation threshold: user has 2 feedback entries; verify personalization is NOT applied (base scores only)
- [ ] 3.5 Add integration test verifying the ±15% capping behavior
