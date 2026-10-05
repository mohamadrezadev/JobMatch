# Iranian job discovery through 9Router

## Problem
Chat currently prepares preferences but does not discover or persist live Iranian job postings.

## Scope (In/Out)
In: owner-checked discovery using saved conversation context, 9Router search/fetch, source allowlisting, conservative normalization, filtering, deduplication, persisted jobs and run reports. Four source queries with ten fetches each, including bounded expansion from listings. Google grounding links are accepted only as narrowly scoped transit routes; job content requires a validated Iranian source. Markdown fallback uses the already configured agents combo with quoted-field validation. Out: changing candidate facts, matching weights, feedback, resumes, new provider accounts and guest discovery.

## API Contract
JWT required. `POST /api/job-discovery/search` accepts only `{ conversationId: UUID }`. Returns `{ success: true, data: { runId, jobs, partial, sources, cached?, code? } }`. `GET /api/job-discovery/conversations/:id/latest` restores the current owned context's result or null. Foreign conversations return 404, invalid input 400, concurrent runs 409, process-local five requests/user/minute 429 and unavailable/unverified providers 503. Failures use a safe error code without provider responses or secrets.

## Acceptance Criteria
Search uses server-owned preferences, restricts fetched URLs before network access, rejects private addresses and unsafe redirects, preserves partial sources, filters hard conditions and ranks soft preferences. Missing fields stay null. Jobs deduplicate by canonical URL and normalized company/title/location. Runs persist context/version, reports, counts, result IDs and safe failure codes. Completed results cache for fifteen minutes. Guest behavior stays unchanged.

## Delivery Limit
Remote search-combo and tinyfish return live responses, but the deployed router omits final destination and source link metadata. A tested patch is prepared under integrations/9router; remote deployment/access remains pending. Live fetch also requires a verified provider policy/controlled egress. Structured/labeled extraction runs first, followed by evidence-checked agents extraction on detail pages. Live four-site acceptance remains pending the remote patch, provider enforcement and representative page validation.
