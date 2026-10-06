# Design
Add ResumeBase (unique userId, content JSON, revision) and ResumeProposal (owner/job, content, sourceSnapshot, baseVersion, status). Keep the existing unique Resume(userId,jobId) as the currently accepted job-specific document to preserve existing URLs, matching gates and legacy records.

Base initialization reads current verified profile facts; it is persisted only by an explicit save. Base updates use optimistic revision checks. Identity comes from the authenticated profile and skills must already be registered. Explicit base prose becomes user-declared source material.

Generation requires a saved base. It copies that base into a server-controlled source snapshot before invoking the model and includes the job description, company, location and required/preferred skills as untrusted target context. The integrity guard restricts output to exact registered source strings. Generation saves a PROPOSED record, leaving the accepted Resume untouched.

Acceptance runs in a serializable transaction. A proposal transitions once to ACCEPTED and upserts the accepted Resume with source provenance. Repeating acceptance returns the owned current resume without rewriting its edits. Source snapshots let accepted documents remain readable when the base changes later. Existing profile-backed and explicitly edited documents retain their existing behavior.

The UI exposes separate base/current modes, a save-base action, proposal comparison and explicit acceptance. Generation always uses the saved base regardless of the currently edited per-job document. Unsaved base edits must be saved before generation. Proposal history is restored on reload. Accepted edits and PDF continue through existing endpoints.
