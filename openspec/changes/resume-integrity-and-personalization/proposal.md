## Why

PRD §17 states an absolute integrity rule: **Pathly MUST NEVER fabricate experience, projects, companies, skills, certificates, job titles, or achievements in resumes.** The current `resume.service.ts` specification only says "generate a tailored resume via OpenAI" without any negative constraint against fabrication. Without this guard, the LLM could hallucinate accomplishments that don't exist in the user's verified profile, destroying product trust.

Separately, PRD §15 describes a personalization loop where `JobFeedback` must influence future `GET /api/jobs/recommended` ranking. The current backend spec defines the Feedback endpoint but omits any downstream effect on recommendations — making the feedback a dead end rather than a learning signal.

Both gaps risk delivering either dishonest output or an unresponsive product.

## What Changes

- Add a hard integrity constraint layer in `resume.service.ts` that strips any LLM-generated claim not verifiable against the user's actual `UserSkill`, `Profile`, and historical employment data
- Log and warn when the LLM attempts to invent facts; fall back to template-based filler text for unverifiable fields
- Modify `jobs.service.ts` `recommended()` to incorporate `JobFeedback` history as a ranking signal (boost jobs rated Interested, demote those rated Not Interested with a reason category)
- Add feedback-reason aggregation endpoint or extend the recommendation algorithm with learned preferences

## Capabilities

### New Capabilities
- `resume-integrity-guard`: Post-processing layer that validates every resume field against source-of-truth user data; rejects/filters fabricated claims before returning to client
- `feedback-driven-recommendation`: Personalization engine that re-ranks `GET /api/jobs/recommended` based on accumulated `JobFeedback` history with weighted reason categories

### Modified Capabilities
- `resume`: Current generation logic unchanged; new guard wraps output
- `jobs`: Recommendation endpoint gains feedback-aware ranking modifier

## Impact

**Files changed:** `backend/src/modules/resume/resume.service.ts` (integrity filter added), `backend/src/modules/jobs/jobs.service.ts` (recommendation ranking revised), new `common/integrity_checker.py` or equivalent.
**API contract unchanged externally**; behaviorally returns more honest resumes and better-ranked recommendations.
**Backend test additions required** for integrity edge cases (LLM hallucination detection).
