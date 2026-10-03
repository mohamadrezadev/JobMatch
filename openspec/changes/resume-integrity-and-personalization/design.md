## Context

The Resume module currently calls OpenAI API and returns generated content without validation against verified user data. This violates PRD §17's absolute integrity constraint. Additionally, the Feedback module exists but its data never influences the recommendation ranking, making the feedback loop a dead end per PRD §19.

## Goals / Non-Goals

**Goals:**
- Add an integrity post-processing layer that strips any resume claim not verifiable against source-of-truth user data
- Wire `JobFeedback` history into the recommendation ranking algorithm in `jobs.service.ts`
- Log integrity violations for monitoring without blocking the resume generation flow

**Non-Goals:**
- Replacing the LLM-based resume generation with a template-only approach (hybrid: LLM + integrity filter)
- Building a real-time learning model (weight updates happen on each feedback submission, no ML training)
- Changing the external API contract of either endpoint

## Decisions

1. **Integrity Guard as post-processor**: Rather than constraining the LLM prompt alone (which cannot be guaranteed), add a `ResumeIntegrityGuard` that cross-checks every field in the generated resume against `UserSkill`, `Profile`, and employment history. Fields that cannot be verified are removed or replaced with `"To be confirmed"` placeholder.
2. **Feedback weighting scheme**: Interested feedback → +15% rank boost for same technology category; Not Interested with reason "Salary" → -10% for jobs outside desired salary range; "Technology" reason → -5% for same tech stack (preference refinement). Weights are configurable via environment variable.
3. **Recommendation re-ranking is additive**: Existing score remains the base; feedback modifier is a small adjustment (+/-) so it never overrides the core match logic.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| LLM may still generate plausible fabrications | Integrity guard catches them post-generation; audit log created for each flagged item |
| Feedback noise from early users skews recommendations | Minimum feedback threshold (e.g., 3 feedbacks per user) before personalization activates |
| Adding personalization increases backend complexity | Keep weights in config; abstract behind `getPersonalizedScore(job, userId)` helper |
