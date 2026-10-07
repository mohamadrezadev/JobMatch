# Verification

## Completed checks
- Full backend unit suite: 435 tests in 34 suites passed. After the final guest partial-result text and ambiguous-stage refinements, the related 23 backend tests passed again.
- Full frontend unit suite: 100 tests in 21 suites passed. After adding two admission/resume regressions and integrating legacy-panel availability, 30 related tests in five suites passed.
- Backend Nest build and backend/frontend TypeScript checks passed after implementation.
- Six PostgreSQL integration tests passed using independent Prisma clients. Twelve concurrent reservations admit exactly one worker; tests also cover shared cooldown, identity separation, failure release, expiry, stale-release fencing, transaction rollback and reuse across different conversations.
- Actual Nest HTTP tests with real JWT/PostgreSQL passed for authenticated active-run reuse, admission status, legacy-route rejection, SSE phase/terminal delivery, HTTP 429 with Retry-After, idempotent replay during pause, guest streamed completion, restored allowance/cooldown and rejection before provider resubmission. Provider/model work uses deterministic fixtures in these tests.
- Existing Playwright verifiers for authenticated and guest chat passed with added source-stage and countdown/draft checks. Coverage includes refresh during an active run, event replay, partial results, known/unknown failure phases, preserved editable drafts, pause expiry, lost-stream recovery without reposting, guest allowance and mobile overflow. Fixture pause timestamps are assigned when completion is delivered; an earlier timestamp-at-fixture-construction caused flaky timing and was corrected.
- Strict OpenSpec validation and whitespace checking passed.

## Deployment and limits
The additive migration 20261007140000_chat_request_admission was applied only to the local PostgreSQL database. Production must apply migrations before deploying this backend. This task does not deploy or publish the changes and does not claim upstream provider reliability has improved.

CHAT_SEARCH_COOLDOWN_SECONDS defaults to 15 and is bounded to 5..60. Leases expire after three minutes. Guest admission is cookie-bound; existing process-local IP throttling and the five-message allowance remain supplemental. No daily quota was added. The legacy discovery POST pauses after any attempted search, including cache reuse; read-only restoration is unrestricted.

The connected browser runtime reported no available browsers. UI verification therefore used the repository's existing isolated Playwright/Chrome scripts. Prisma generation encountered a Windows DLL rename EPERM; the generated client includes the added model and its existing engine worked for the database/HTTP tests and backend build. Admission uses parameterized SQL for atomic reservation rather than generated model mutations. A full production frontend packaging build was not run in this change; frontend TypeScript and real-browser compilation/interaction passed.

## Pre-commit coverage check
All 537 unit tests passed: 435 backend and 102 frontend. Overall line coverage
is 65.87% backend and 81.12% frontend. The advisory 95% per-file target is not
met by all touched files; no required coverage gate is configured. These unit
measurements exclude the separate PostgreSQL/HTTP integration suite. No
pre-change coverage baseline is available, so regression comparison is unknown.

| File | Lines | Branches | Functions | Advisory target |
|---|---:|---:|---:|---|
| backend/chat-admission.module | 0 | 100 | 100 | Below |
| backend/chat-admission.service | 21.05 | 0 | 0 | Below |
| backend/chat-run.controller | 0 | 0 | 0 | Below |
| backend/chat.controller | 0 | 100 | 0 | Below |
| backend/job-discovery.controller | 0 | 0 | 0 | Below |
| backend/chat-run.service | 38.96 | 16.25 | 34.61 | Below |
| backend/guest-chat.controller | 63.15 | 37.5 | 46.66 | Below |
| frontend/DiscoveryPanel | 79.16 | 46.87 | 44.44 | Below |
| frontend/guest-chat-stream | 90 | 70 | 57.14 | Below |
| frontend/ChatExperience | 83.73 | 74.28 | 58.82 | Below |
| frontend/chat-availability | 87.5 | 92.85 | 60 | Below |
| frontend/useChatRunStore | 73.71 | 61.83 | 65 | Below |
| backend/chat-exception.filter | 88.23 | 65 | 100 | Below |
| frontend/useDiscoveryStore | 92.45 | 69.44 | 100 | Below |
| frontend/SourceProblems | 100 | 72.72 | 100 | Below |
| frontend/RunActivity | 83.33 | 74.73 | 75 | Below |
| frontend/GuestChat | 89.51 | 76.42 | 83.33 | Below |
| backend/guest-chat.service | 97.43 | 92.5 | 85.71 | Below |
| frontend/TaskProgress | 100 | 92.68 | 100 | Below |
| backend/discovery-issue | 100 | 100 | 100 | Pass |
| frontend/guest-chat-client | 100 | 100 | 100 | Pass |

Coverage commands are the existing Jest runner with --coverage,
--coverageReporters=json-summary and --coverageReporters=text-summary in each
workspace. Missing unit coverage in controller/admission paths should be
addressed with focused HTTP/error and configuration tests; passing integration
tests are not counted as unit coverage.
