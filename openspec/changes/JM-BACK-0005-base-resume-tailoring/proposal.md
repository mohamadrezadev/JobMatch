# Problem
Regeneration currently upserts the accepted job resume from profile facts, destroying manual edits. The model sees only the job title and required skills.

# Scope
In: one editable base resume per owner; independent proposals per job; explicit acceptance; full job context; persisted proposal history; existing accepted resume editing/PDF and ownership checks.
Out: chat execution, file parsing/import, fabricated or unverified prose, changes to matching policy.

# API Contract
- GET /api/resumes/base: saved base or profile-backed initial draft, with version 0 for an unsaved draft.
- PUT /api/resumes/base: save explicit summary/highlights/verified skills and expected version; reject stale edits with 409.
- POST /api/resume/generate {jobId}: create a proposal from saved base; never mutate the accepted resume.
- GET /api/resumes/proposals?jobId=: list owned proposals for a job, newest first.
- POST /api/resumes/proposals/:id/accept: accept once into the existing per-job resume; return that accepted resume.
- Existing /api/resumes/:id editing and PDF endpoints remain for accepted resumes.

# Acceptance Criteria
Saved base edits feed the model with the full job description. Generated facts remain grounded in a server-held base snapshot. Accepted edits survive regeneration and reload. Accepting a proposal preserves the base and is idempotent. Foreign IDs return 404. Existing resumes remain available. Model failure preserves all prior content.
