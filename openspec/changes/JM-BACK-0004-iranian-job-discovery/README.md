# Discovery delivery and setup

PRD-002 is implemented in `backend/src/modules/job-discovery` and frontend change `JM-FE-0005-iranian-job-discovery`. The supplied PRD is retained as product input in `openspec/prds/PRD-002-iranian-job-discovery.md`, rather than executable instructions.

## Delivery status

Implemented: authenticated, owner-scoped discovery from server-owned chat context; bounded four-source search; source/DNS/redirect validation; Google grounding continuation; listing-to-detail traversal; structured normalization and evidence-checked agents extraction; filtering, deduplication, persisted runs, cache and restoration; result cards and partial/empty/error states. Guests retain five messages and receive a registration/login invitation before discovery. Ordinary job pages do not silently substitute design fixtures for live data.

The migration is deployed locally. Backend is configured at http://localhost:3100 and frontend at http://localhost:3001. Credentials are stored only in ignored environment files.

On 2026-10-05 the user applied `integrations/9router/patch-npm-0.5.95.cjs` to their Windows npm 9router@0.5.95 installation and reported restarting it. Subsequent authenticated probes of the remote router confirmed:

- example.com fetch returned HTTP 200 and an explicit final_url.
- Jobinja's listing returned HTTP 200, its final source URL and 146 links.
- search-combo returned three results; fetching a Google grounding result exposed the reached Jobinja source URL and 143 links.
- One actual Jobinja detail page returned HTTP 200, 4,308 characters and 83 links in about 2.4 seconds.

These probes verify the metadata fix, not successful live discovery inside JobMatch. `NINEROUTER_FETCH_POLICY_VERIFIED` remains false. Provider/egress enforcement for every private/reserved address and redirect destination remains unverified; authenticated full four-source acceptance is still pending. Do not mark the feature operational on the strength of direct router probes alone.

## Provider configuration

Search uses `search-combo`, fetch uses `tinyfish`, and LLM extraction/generation uses `agents`. The supplied remote router is configured in ignored backend `.env`. Local port 20128 rejects the supplied remote key. `/v1/models/web` returns an empty list despite the working search aliases, so explicit aliases do not rely on registry enumeration. `agents` was verified on chat completions; it is not the configured web search/fetch provider.

Set these in backend `.env` only (never NEXT_PUBLIC variables):

```dotenv
NINEROUTER_BASE_URL=http://127.0.0.1:20128/v1
NINEROUTER_API_KEY=
NINEROUTER_SEARCH_MODEL=search-combo
NINEROUTER_FETCH_MODEL=tinyfish
NINEROUTER_FETCH_POLICY_VERIFIED=false
JOB_DISCOVERY_ALLOWED_DOMAINS=jobvision.ir,jobinja.ir,irantalent.com,e-estekhdam.com
JOB_DISCOVERY_SEARCH_TIMEOUT_MS=15000
JOB_DISCOVERY_FETCH_TIMEOUT_MS=15000
JOB_DISCOVERY_TOTAL_TIMEOUT_MS=60000
OPENAI_BASE_URL=http://127.0.0.1:20128/v1
OPENAI_API_KEY=
OPENAI_MODEL=agents
```

Base URLs with or without /v1 are supported. Search expects bare results[].url. Fetch expects content.text and url; bridge continuation requires explicit final_url. The client requests source links and bounds text to 200,000 characters. Google is permitted only as an exact transit route, never as a job source. Listing expansion stays within ten fetches per source. Single detail pages without structured fields can use agents extraction; exact quoted evidence is required, unknown fields remain null, and candidate facts are not changed. Lexical quotation checks do not prove semantic accuracy.

Before setting the policy flag true, establish provider or controlled-egress restrictions for all source/redirect hosts and private/reserved DNS answers. Backend preflight validates and pins DNS but cannot prove that a remote provider makes the same request. The metadata patch alone does not establish that policy. Keep fetch disabled until enforcement is verified. See `integrations/9router/README.md` for installation, rollback and verification.

## Database

Migration: `backend/src/prisma/migrations/20261005160000_iranian_job_discovery`. Before another database deployment, inspect and deliberately resolve duplicate non-null source URLs before creating the unique index. No local jobs were removed; the table was empty when the migration was deployed.

From backend, run `pnpm exec prisma generate`, `pnpm exec prisma migrate deploy`, then `pnpm run dev`. Private local settings remain in ignored `.env`.

## Verification

129 backend unit tests and 29 frontend unit tests pass. The opt-in PostgreSQL/JWT discovery suite plus existing HTTP contracts has previously passed 13 integration tests. Backend/frontend builds, strict OpenSpec validation and standalone Chrome checks have passed. The npm patch verifier passes against the exact unmodified published 0.5.95 bundle, including mocked execution of the compiled TinyFish handler, missing provenance, version/hash guards, check-only behavior, backup, conflicting edits, idempotency and rollback.

Coverage reports are generated by backend `pnpm run test:cov` and frontend `pnpm exec jest --runInBand --coverage`. The 95% per-file target is not met by all touched files; there is no configured required coverage gate. Coverage results must not be presented as complete test coverage.

To run PostgreSQL integration tests, set `JOB_DISCOVERY_DB_TEST=true` and `DATABASE_URL` to a migrated local test database, then run `pnpm exec jest --config test/jest-integration.json --runInBand` from backend. Fixtures use unique users/jobs, exercise the real JWT/application/Prisma pipeline against a mock router, and clean up their own records. DNS is mocked; this is not live source acceptance.

From frontend, `node scripts/verify-job-discovery.cjs` verifies real local guest/login/chat/unavailable-provider behavior, then uses browser-only fixtures for cards, partial/empty results, salary warnings and mobile layout. Screenshots are ignored under `.visual-check`. It does not verify successful live four-site discovery.

Remaining acceptance: verified remote fetch enforcement and an authenticated real four-source flow, including filtering and source-page checks. No provider credentials are stored in this repository.
