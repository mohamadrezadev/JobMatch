# Live discovery acceptance — 2026-10-05

## Fetch policy evidence and trust boundary

The user runs npm 9router@0.5.95 and installed the provided final_url/links patch. Live probes confirmed provider `tinyfish`, explicit final destinations and source links. Authenticated requests to IPv4 loopback and IPv6 loopback returned HTTP 400 `Blocked URL: internal host`. A file-scheme request was rejected by TinyFish; no local file content was returned.

The [official TinyFish Fetch reference](https://docs.tinyfish.ai/fetch-api/reference) documents HTTP(S)-only targets, rejection of private/localhost/metadata addresses, and `invalid_redirect_url` for private or disallowed redirect destinations rejected before fetching. The published 9Router adapter routes TinyFish to its native fetch service. These are reviewed provider guarantees, not an independent audit of TinyFish's infrastructure or a DNS-rebinding penetration test.

Local activation relies on that native provider contract plus JobMatch's pinned-DNS preflight and final-source validation. Every TinyFish response must identify the actual provider as `tinyfish` and provide an explicit absolute HTTP(S) final_url; source allowlisting/public-DNS checks then run before extraction. Model combos that return another provider are rejected. Google is only a constrained transit candidate. User-supplied URLs/domains remain prohibited.

The complete sequence of remote intermediate hosts is not exposed by TinyFish. JobMatch checks its own redirect hops and the provider's final destination, and relies on TinyFish for remote private-address/redirect blocking. A deployment requiring independently enforced project-domain restrictions on every intermediate remote hop still needs controlled egress or a provider exposing/enforcing that policy. The previous blanket claim that all remote hops were independently verified is not made here.

`NINEROUTER_FETCH_POLICY_VERIFIED=true` is set only in the ignored local environment for the reviewed TinyFish configuration. The committed example remains false. Reassess the policy before changing the router deployment, provider or native endpoint.

## Successful live flow

Authenticated chat `کار بک‌اند Node دورکار می‌خوام` triggered actual search-combo queries for all four configured sources. The application fetched real pages through the remote router, filtered extracted postings, persisted one matching remote Node.js job, and returned HTTP 200 with partial=true. No discovery response fixtures were used for this acceptance.

The opt-in Chrome check `JOBMATCH_LIVE_DISCOVERY=true node scripts/verify-job-discovery.cjs` passed: actual chat/discovery, four source reports, matching remote cards, original source links, persistence/history restoration without another search, and mobile composer placement. Ordinary deterministic browser checks separately use explicit fixtures for unavailable/empty/partial UI states.

A live update `حداقل ۲۰ میلیون، بدون Python` persisted minimumSalary=20000000 and excludedSkills=["Python"], and returned an actual remote Node.js posting with undisclosed salary, the warning `حقوق در آگهی اعلام نشده`, and no required Python skill. Repeating the same version returned cached=true. Unknown salary is retained by product rules; it is not presented as meeting a verified salary threshold. Explicit skill exclusions and compound salary/profile turns have regression tests. Denied candidate skills remain profile facts and do not silently become user search preferences.

## Fixes found through acceptance

- Listing/detail starvation: prefer discovered detail links over queued listing bridges within ten fetches per source; prioritize role terms present in URL paths without inventing any fields.
- Jobinja Markdown: read source-specific primary title/company headings and explicit labeled fields; exclude company biography and related vacancies; unknown fields stay null. This reduces dependence on slow LLM fallback.
- Failed-run observability: preserve safe source reports when the application returns failure instead of discarding the reports.
- Compound chat turns: retain minimum salary when a comma separates it from a candidate's skill statement.
- Require TinyFish identity and final provenance for direct detail pages as well as Google bridges.

## Limits

Some Jobvision/IranTalent/e-estekhdam attempts failed or reached the sixty-second budget. Partial results and warnings were exercised; reliable healthy retrieval from each of the four sites has not been established. Listings and source layouts can change; failed extraction is rejected rather than replaced with samples or invented facts. Evidence-checked LLM fallback is still not a semantic correctness proof.

Verification: 140 backend unit tests, 14 HTTP/PostgreSQL integration tests and 29 frontend unit tests pass; backend build passes. Both deterministic and live Chrome discovery checks pass. Frontend runtime code is unchanged in this acceptance phase; its build passed previously. Full healthy four-site reliability, production egress audit and the advisory 95% coverage target remain follow-up work.

## Follow-up: lost response recovery

After a user reported the generic search failure, the latest observed server run completed and persisted partial results. This does not conclusively identify that user's browser failure; the browser URL/transport error was requested for diagnosis. The frontend now attempts one owner/context-scoped latest-result read after a disconnected POST, 5xx or in-progress conflict, without starting another discovery run. Recovery ignores responses after switching accounts/context. No saved result means the original failure remains, with separate messages for network interruption and provider unavailability.

The explicit lost-response browser fixture, all 32 frontend unit tests and frontend production build pass. Real source reliability limits above remain unchanged; response recovery does not hide provider failure or fabricate jobs.

## Follow-up: Persian .NET request readiness

The exact user message `یه کار بکند دات نت با حقوق 60 تومن حضوری تهران` originally lacked a recognized role: `بکند` and `دات نت` were missing aliases. Added common backend/dotnet spellings, Persian .NET title matching, and explicit ON_SITE normalization. Candidate skills are not inferred from these preferences. Regression tests assert JOB_SEARCH, readyForSearch=true, .NET role, 60,000,000 toman minimum, OnSite and Tehran.

A real Chrome submission of that exact message triggered the actual discovery POST with its persisted conversation ID. That search returned HTTP 200, jobs=0, partial=true; this confirms automatic triggering, not availability of a matching vacancy. The standalone script provides the opt-in `JOBMATCH_DOTNET_TRIGGER=true` regression mode. All 148 backend unit tests and backend build pass after this fix.
