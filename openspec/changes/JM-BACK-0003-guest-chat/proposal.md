# Guest Career Copilot

## Problem
Requiring authentication before the first chat prevents visitors from trying JobMatch. A browser-only limit can be bypassed by reloading, and registration must not discard the conversation.

## Scope
Allow five successful guest messages per cookie-bound 24-hour session. Persist the transcript, context and counter in PostgreSQL, using a hashed random HttpOnly cookie token. Reuse the existing context extraction and replies. Enforce quota and optimistic concurrency on the server. Transfer a guest conversation atomically into the authenticated owner's history. Existing authenticated chat remains guarded.

## API Contract
- `GET /api/chat/guest`: public, restores `{ messages, context, remaining, limit: 5, authRequired }` in the success/data envelope. Does not create a session.
- `POST /api/chat/guest/message`: public, `{ message: string }`, nonblank and at most 4000 characters. Returns the same state. A sixth turn returns HTTP 403, `GUEST_LIMIT_REACHED`; conflicting writes return 409. At most 20 send requests per IP per minute per server process.
- `POST /api/chat/guest/claim`: JWT required; returns `{ conversationId: string | null }`. Transfers context and messages once, permits retries by the same owner and rejects other owners. Clears the guest cookie after success.
- All guest responses use `Cache-Control: no-store`. Mutations reject a supplied foreign Origin. Browser requests include credentials; cookie uses SameSite=Lax and Secure in production. Deployment requires frontend/API on the same site and an exact CORS_ORIGIN.

## Acceptance Criteria
Five guest turns work without a profile/account; the sixth cannot mutate history. Reload and server restart retain the counter. Concurrent sends cannot exceed quota. Blank/oversized/extra fields are rejected. Claim is guarded, atomic and owner checked. Expired sessions cannot read/write/claim and are purged when a new session is created.

## Limits
This is a session allowance, not a verified-person allowance; removing cookies creates a new session. The IP throttle is process-local and is not a distributed production abuse-control service. Conversation replies retain the existing bounded extractor; this change does not add an LLM provider or execute job searches.
