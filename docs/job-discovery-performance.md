# Job discovery latency and incomplete results

The production guest-chat baseline returned a simple preference message in 3.8 seconds. A request for ten accounting jobs in Tehran took 61.7 seconds and returned fifteen jobs with incomplete source reports. These are individual measurements, not latency guarantees.

The provider starts all four sources concurrently. Previously, each source fetched and validated up to ten pages sequentially. The provider now processes up to three detail pages concurrently per source, retaining the ten-page cap, URL and redirect checks, closed-posting checks and cancellation guards. Listing-only search results first open one listing to prioritize actual vacancy links. Accepted jobs continue to publish through the existing authenticated chat event stream.

An incomplete discovery with no jobs was also eligible for the fifteen-minute cache. It now starts a fresh search when retried. Completed empty searches and partial searches containing jobs retain their existing cache behavior.

The activity header and assistant reply distinguish an incomplete empty search from a completed search without matching results. Work-type constraints remain strict: a vacancy without explicit onsite evidence does not satisfy an onsite-only request. Speed improvements do not relax these checks.

Regression checks cover concurrent detail fetches, live candidate publication, cancellation, the page budget, link validation, retry-cache behavior and the partial-result display. The existing sixty-second search deadline remains in place; slow external providers can still cause partial results. Guest chat still waits for its final search response, while authenticated chat can display accepted jobs progressively.

The production recheck also found expired temporary backend domains and a CORS origin left pointing to an older frontend hostname. The frontend can now proxy API requests and the authenticated event stream through Runflare's private backend service, using an explicitly empty public API URL. This avoids a second expiring public domain. Public access still requires an active frontend domain; temporary domains are unsuitable for continuous availability.

After deployment on 2026-10-06, the HTTPS frontend API proxy returned HTTP 200. The guest accounting search returned in 30.3 seconds with zero jobs and failures for all four source searches. Direct local probes of the configured router's `/v1/models/web` and `/v1/search` each timed out after eighteen seconds. This failed search is not evidence of improved successful-search latency; an additional successful benchmark is needed after router connectivity is restored.
