# Chat-first landing delivery

The root now presents the JobMatch landing and a working conversation. `/dashboard` redirects to `/`; root has no sample statistics or persona. `/chat` works for guests and authenticated users. Both authentication flows route to `/chat`.

## Guest continuation

Guests can send five successful messages in a 24-hour cookie session. The quota and extracted context are persisted in PostgreSQL, so reload and application restarts do not reset the allowance. A sixth message returns `GUEST_LIMIT_REACHED` from the server. Concurrent writes use compare-and-swap and cannot exceed five turns. The quota is per session; clearing cookies starts a new session. The process-local request throttle is 20 sends per IP per minute.

Login or registration transfers the guest transcript and context into an owned conversation in one transaction. The pending draft remains editable and is never sent automatically. The claim result is kept under an owner-scoped key until history loads, allowing recovery after a failed history request.

## Implementation

- `frontend/src/components/landing/LandingPage.tsx`: responsive brand header, hero, active chat, benefits, steps and FAQs.
- `frontend/src/components/chat`: reusable guest and authenticated experiences with errors, retries, quota and continuation.
- `backend/src/modules/chat`: guest domain/application/repository/controller and shared reply helper.
- `backend/src/prisma/migrations/20261005120000_guest_chat/migration.sql`: deployed locally.
- Backend change: `JM-BACK-0003-guest-chat`; frontend change: `JM-FE-0004-chat-first-landing`.

## Validation

- Backend unit tests: 54 passed.
- HTTP integration tests with the real JWT guard: 8 passed, including input validation, quota, origin, ownership and rate limit.
- Frontend unit tests: 23 passed, including failed send/retry, exhausted quota, stale local quota and guest import/draft retention.
- Strict TypeScript checks: backend and frontend passed.
- Frontend production build: passed, 14 pages generated.
- Both OpenSpec changes: strict validation passed.
- Standalone Chrome: both themes and persistence, desktop/mobile without overflow, five guest messages, direct sixth-request rejection, reload, login continuation and a real sixth authenticated message, registration continuation, dashboard redirect and concurrent quota boundary passed without browser JavaScript errors.

Run `node scripts/verify-jobmatch-landing.cjs` from frontend with the frontend/backend running and system Chrome installed. It creates a local registration fixture and sends test messages. Screenshots are under ignored `frontend/.visual-check/`. No e2e framework was scaffolded.

Local frontend: http://localhost:3001. Local backend: http://localhost:3100.