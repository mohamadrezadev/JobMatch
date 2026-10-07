# Explain live agent work and control request admission

## Problem
The existing activity feed mixes repeated planner events and source updates. Users cannot easily identify completed work or the failed phase. Process-local throttles and conversation-local active checks allow expensive work across tabs, conversations and replicas, without explaining the wait before resubmission.

## Scope (In/Out)
In: real-event task timeline for authenticated and guest chat; per-source failure stage; PostgreSQL request admission across replicas; one active user/session; resumable active runs; configurable fifteen-second post-search pause; countdown and availability restoration; gate legacy HTTP routes too.

Out: daily quotas, upstream provider fixes, new dependencies, fabricated progress percentages, additional model reasoning visibility and changes to matching conditions.

## API Contract
Existing chat/run/result contracts remain compatible. Add admission metadata (activeRunId, active, nextAllowedAt, retryAfterSeconds) and GET /api/chat/availability. Reused active-run responses identify reuse. Admission errors include stable code and retryAfterSeconds. Guest restore/completion includes availability. Migration adds an independent request-gate table.

## Acceptance Criteria
- Task/source stages reflect actual events and remain readable after completion/replay.
- Failures identify the known stage; unavailable upstream results are not reported as absence of vacancies.
- Separate database clients cannot reserve simultaneous requests for the same user/session.
- New conversations and legacy HTTP routes do not bypass admission.
- Duplicate run IDs replay without another execution; an active authenticated run can be resumed.
- Searches pause for fifteen seconds by default after completion/failure; general chat does not.
- Drafts remain editable and preserved during pauses; reload restores server availability.
- A crashed worker's lease expires; stale releases cannot unlock newer work.
- Existing guest allowance, count goal, matching rules and discovery cache stay intact.
