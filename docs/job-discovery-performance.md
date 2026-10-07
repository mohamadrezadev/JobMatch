# Job discovery latency and incomplete results

## Live progress and public failure explanations — 2026-10-07

Both authenticated and guest chat now show actual task progress: interpreting
conditions, planning searches, searching vacancy links, fetching detail pages,
extracting information and matching vacancies. Sources run concurrently, so
their stages can differ. The display summarizes task activity without exposing
model reasoning, raw provider responses or search diagnostics.

Guest chat uses `POST /api/chat/guest/message/stream` with the same origin checks,
throttling, validation, cookie scope and message allowance as the existing JSON
endpoint. The stream publishes progress and a final committed state; failures
after headers are sent use a terminal `guest.failed` event. Disconnecting does
not submit another message. The UI makes one read-only recovery request for a
committed matching turn and retains the draft if the result is unavailable.

Per-source failures remain visible beside retained healthy results, including
after authenticated activity is collapsed and guest history is restored.
Recognized site error pages, provider failures and extraction failures have
distinct public explanations. Timeout and empty-content cases avoid claiming
that the site or provider caused the failure when the evidence is insufficient.

IranTalent and e-estekhdam still need an alternative permitted retrieval path
or an upstream fetching fix. A direct HTML-format check returned the same
connection-error screen for e-estekhdam and timed out for IranTalent; changing
the response format alone did not resolve either source. A browser-rendered
fallback should be validated on real vacancy pages before integration, retaining
the current URL/provenance checks and the overall search deadline.

Verification: backend unit suite (410 tests), frontend unit suite (86 tests),
ten PostgreSQL discovery/live-run integration
tests, the actual guest SSE HTTP tests and both deterministic browser progress
flows passed. Frontend TypeScript checking passed. Backend build passed;
frontend compilation/type checking/static generation passed, but standalone
packaging failed because this Windows environment refused dependency symlinks
(`EPERM`). This is not a completed production frontend build.

The real Chrome/cookie-bound API recheck also passed progress delivery,
committed-state retrieval and refresh restoration. Its onsite accounting request
with a 30,000,000 toman minimum returned zero jobs and a partial result; this
verifies the application flow, not resolution of the remaining source failures.

The pre-commit coverage run passed all 496 unit tests. Overall line coverage was
66.42% for backend and 79.45% for frontend; touched files do not all meet the
advisory 95% line/branch/function target. No required coverage gate is configured
in this repository. The public discovery-issue mapping has 100% coverage for
all three metrics. These measurements do not establish a coverage comparison
against the previous commit.

## Local provider reliability check — 2026-10-07

Fetch retries now permit at most two attempts for HTTP 502/503/504 and transient
network/timeouts, sharing the existing per-page timeout. Caller cancellation,
authentication failures, HTTP 429, malformed responses and missing final provenance
do not trigger retries. The sixty-second overall search deadline is unchanged.
Server logs record a safe page URL (without query parameters or grounding tokens),
stage, elapsed time, error code and available HTTP status/attempt count. Upstream
response bodies, API keys and Axios request headers are never logged.

Known connection, JavaScript and access error screens are rejected before model
extraction. The observed English Jobvision detail layout is parsed locally using
its primary title/company/location and labeled requirement/description sections;
related vacancies cannot supply salary or other facts. Unsupported layouts retain
the existing evidence-checked model fallback. Its default timeout is now eight
seconds, configurable with `JOB_DISCOVERY_EXTRACTION_TIMEOUT_MS` and bounded to
one through twelve seconds, still subject to search cancellation.

A direct live provider round for Backend Developer in Tehran with a 20,000,000
toman minimum returned six matching vacancies in 32.8 seconds: three from
Jobvision and three from Jobinja. This is one provider-round measurement, not an
end-to-end chat latency guarantee or proof that their salaries meet the minimum.
IranTalent still returned empty-content/timeouts; e-estekhdam returned a connection
error screen. These failures are now diagnosed explicitly while healthy results
are retained. The local measurement artifact is
`artifacts/discovery-diagnostics/option-one-live-result.json`.

The PostgreSQL integration cache assertion now compares search counts before and
after cache reuse; its previous fixed count assumed only one agent query round.

The production guest-chat baseline returned a simple preference message in 3.8 seconds. A request for ten accounting jobs in Tehran took 61.7 seconds and returned fifteen jobs with incomplete source reports. These are individual measurements, not latency guarantees.

The provider starts all four sources concurrently. Previously, each source fetched and validated up to ten pages sequentially. The provider now processes up to three detail pages concurrently per source, retaining the ten-page cap, URL and redirect checks, closed-posting checks and cancellation guards. Listing-only search results first open one listing to prioritize actual vacancy links. Accepted jobs continue to publish through the existing authenticated chat event stream.

An incomplete discovery with no jobs was also eligible for the fifteen-minute cache. It now starts a fresh search when retried. Completed empty searches and partial searches containing jobs retain their existing cache behavior.

The activity header and assistant reply distinguish an incomplete empty search from a completed search without matching results. Work-type constraints remain strict: a vacancy without explicit onsite evidence does not satisfy an onsite-only request. Speed improvements do not relax these checks.

Regression checks cover concurrent detail fetches, live candidate publication, cancellation, the page budget, link validation, retry-cache behavior and the partial-result display. The existing sixty-second search deadline remains in place; slow external providers can still cause partial results. Guest chat shows live progress and displays jobs after the committed final state, while authenticated chat can display accepted jobs progressively.

The production recheck also found expired temporary backend domains and a CORS origin left pointing to an older frontend hostname. The frontend can now proxy API requests and the authenticated event stream through Runflare's private backend service, using an explicitly empty public API URL. This avoids a second expiring public domain. Public access still requires an active frontend domain; temporary domains are unsuitable for continuous availability.

After deployment on 2026-10-06, the HTTPS frontend API proxy returned HTTP 200. The guest accounting search returned in 30.3 seconds with zero jobs and failures for all four source searches. Direct local probes of the configured router's `/v1/models/web` and `/v1/search` each timed out after eighteen seconds. This failed search is not evidence of improved successful-search latency; an additional successful benchmark is needed after router connectivity is restored.
