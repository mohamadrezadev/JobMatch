# Live chat runs — phase 1

Authenticated chat now creates a persisted `ChatRun` and observes actual backend
activity through SSE. Context extraction remains rule-based; the final assistant
message is a factual summary, without simulated token streaming or LLM orchestration.
Guest chat retains its existing cookie, quota and claim behavior in this phase.

## HTTP contract

- `POST /api/chat/runs`: `{ requestId: uuid, message, conversationId? }`, returns
  HTTP 202 and `{ success: true, data: { runId, conversationId } }`. A new conversation
  ID can be null until `context.updated`. Repeated requests with the same owned
  `requestId` return the same attempt. Rate limit: 10 create requests per minute.
- Retry: the same endpoint with `{ requestId: uuid, retryOf: failedRunId }`.
  Creates a new attempt without appending the user message again. Retry requires
  an unchanged committed conversation version. Only one active run per conversation
  is allowed, enforced by a partial unique PostgreSQL index.
- `GET /api/chat/runs/:id/events`: owned Bearer-authenticated SSE. Each frame carries
  `id: sequence`, a named event, and a JSON envelope containing `id`, `runId`,
  `sequence`, `type`, `timestamp` and `data`. Resume via `Last-Event-ID` or `after`.
- `GET /api/chat/conversations/:id/runs`: restores up to 100 runs and their first
  200 events. The bounded four-source search emits fewer than 200 events per run.
  The browser restores activity without replacing newer conversation history.

## Behavior

The backend publishes source progress during traversal. Each job passes the search
filters and deduplication before being saved and emitted with its durable ID.
Provider diagnostics and raw queries are removed from public progress events.
Completed cached searches emit `search.cached`, without fictitious source activity.
Partial source failures retain valid jobs. Full failure permits a new run with the
same message pair. Activity collapses after completion while job cards remain visible.

The fetch SSE client uses existing Bearer authentication, reconnects with the last
applied sequence, ignores duplicates, detects sequence gaps, and times out stalled
connections. Changing accounts/conversations aborts the observer. Disconnecting the
observer does not cancel backend work. Session history is persisted in PostgreSQL.

## Operations and limits

Apply the `20261005160000_live_chat_runs` migration and regenerate Prisma Client.
Web searches use the router's `search-combo` via `/v1/search`. Set
`NINEROUTER_SEARCH_MODEL=search-combo`; an absent or blank value also defaults to
this combo. Page fetching retains its separately configured fetch provider.
Runs execute in the Nest process. There is no durable task queue in this phase.
An attempt interrupted by a process restart is marked `RUN_INTERRUPTED` on the next
read after three minutes and can be retried once its turn has committed. Graceful
module shutdown waits for active work. SSE polls the shared event table every 250ms
and sends heartbeat comments every 15s; production proxies must permit streaming
and sufficient connection timeouts. The response disables buffering/cache transforms.

Future stages: guest live runs, LLM response generation/streaming, tool calling,
matching events, resume events, cancellation and durable task workers.

## Validation

```powershell
cd backend
pnpm exec jest --runInBand
$env:CHAT_RUN_DB_TEST = 'true'
pnpm exec jest --config ./test/jest-integration.json --runInBand test/integration/chat-runs.integration.spec.ts
pnpm exec nest build
cd ../frontend
pnpm exec jest --runInBand
node scripts/verify-job-discovery.cjs
pnpm exec next build
```

The opt-in integration suite uses the configured local PostgreSQL database, real
JWT guards, real chat/discovery repositories, and an isolated controlled discovery
provider. It verifies a saved result before completion, replay, ownership, idempotency,
retry and interrupted-run recovery, and deletes its fixtures. Browser verification
uses deterministic API/SSE fixtures with the installed Chrome/Playwright tooling;
it does not claim real external provider availability. Legacy browser verification
is still available with `JOBMATCH_LEGACY_DISCOVERY=true`.
