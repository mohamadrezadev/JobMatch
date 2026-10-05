# Design

Add /chat to existing dashboard layout and navigation. Use a typed Zustand chat store and existing auth/API client. Do not persist chat content in localStorage. Reset on auth change and ignore stale async responses.

Use labelled semantic forms, visible status/error messages, aria-live history and dir=auto for mixed language. Preserve draft on failure. Server context determines readiness solely from target roles.
