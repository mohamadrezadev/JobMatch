# Chat progress and request control

## Product behavior
Show actual task events in a compact timeline: understand request, search links,
receive pages, extract posting information, match constraints, prepare results.
Sources run independently; the source view must not imply a global sequential
pipeline or invent percentage completion. Retain confirmed results and identify
the stage at which each source could not finish. Unknown timeout origins remain
unknown. No internal model reasoning or provider credentials are published.

Before submission, explain that one request runs at a time, source search has a
sixty-second budget, and fewer than the requested number may be confirmed.
After a search, default to a fifteen-second pause, configurable on the server.
Show a countdown without erasing the user's draft. Do not introduce daily quotas.

## Admission rules
PostgreSQL owns short-lived request leases and next-allowed timestamps. A signed-in
user has one lease across conversations, browser tabs and server instances. A
cookie-bound guest has one lease across tabs and server instances; the existing
IP throttle and five-message allowance continue to mitigate session resets.
An existing authenticated run can be resumed without submitting another message.
Idempotent request replay must work even during the pause.

Reserve before model/provider work and release after completion or failure.
Only searches incur the post-search pause; general conversation does not.
Leases expire after three minutes so a killed worker cannot block indefinitely.
Release checks the lease ID so a late worker cannot release a newer request.
Legacy chat and discovery HTTP routes use the same authenticated admission key.
No external service or new package is required. Completed empty searches and
partial results keep the existing discovery-cache policy.

## Contracts and verification
Add authenticated availability metadata and a read-only availability endpoint;
guest restoration/completion includes the same pause/active metadata. Admission
failures carry a stable code and retryAfterSeconds, with HTTP Retry-After where
applicable. SSE admission failures use the same structured fields.

Verify live event replay, per-source failure stages, retained drafts, countdown,
duplicate reuse, simultaneous reservations through separate database clients,
expiry, stale release, failure release, owner isolation and legacy-route gates.
Production requires deploying the additive migration before backend code.
