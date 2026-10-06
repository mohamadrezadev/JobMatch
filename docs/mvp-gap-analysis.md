# JobMatch MVP: baseline and execution plan

Date: 2026-10-06. Source of scope: `openspec/prds/PRD-003-jobmatch-mvp.md` (the supplied PRD, preserved verbatim). This supersedes the older Pathly demo brief for this change.

## Verified baseline

The repository is NestJS/Prisma/PostgreSQL plus Next.js/React/Zustand. The worktree was clean before this work. Graph metadata was stale; material findings were verified against current source.

| PRD area | Current implementation | Required change |
| --- | --- | --- |
| Auth | Register, login, refresh, current user; local logout | Restore profile gate per account and keep rotated refresh tokens |
| Onboarding | Four screens; profile saved before skills; skill failures swallowed; names discarded | Validated atomic backend completion, persist all fields, report errors |
| Career chat | Persian intent extraction, conversation persistence and follow-up context | Retain and regression-test existing flow |
| Discovery | Provider, source validation, normalization, deduplication, persisted discovery runs | Retain; verify partial results and external dependencies |
| Run experience | Persisted ChatRun/events, streaming, recovery, retries | Retain and regression-test |
| Jobs | Keyword backend search; UI fetches 50 rows and filters locally | Validated GET filters and pagination before fetching; personalized card data |
| Matching | Skills/experience/location/salary; unknown values sometimes score 100 | Explicit unknown state, work type, explainable weighted score |
| Feedback | Backend persistence exists; no jobs UI controls | Interested/reject with reason, latest feedback per job |
| Recommendations | Latest five jobs only | Profile-based matching and bounded feedback modifiers after three distinct jobs |
| Dashboard | Route redirects; unused reference view has static/demo statistics | One authenticated aggregate endpoint and actual dashboard |
| Resume | Backend upsert exists; frontend local draft; only skill array guarded; PDF is JSON placeholder | Guard every factual block, owned list/read/update, actual backend PDF and saved resume restoration |
| Profile/preferences | Basic profile form; OnSite enum mismatch; decorative notification switches | Compatible work types, persisted preferences, remove unavailable notifications |
| Academy | Active desktop/mobile navigation | Remove navigation and redirect legacy route |
| Analytics | No dedicated funnel events | Persist validated events and connect user-flow triggers |

## Decisions for implementation

1. Deliver the definition-of-done flow together; onboarding, persistence, server filtering and PDF are release requirements even where the PRD calls them P1.
2. Matching weights: skills 60%, experience 20%, location 5%, work type 5%, salary 10%. Unknown data is labelled and receives a neutral 50, not a claimed full match. Remote location is independent of work-type preference.
3. Salaries are monthly toman. An explicit minimum excludes jobs with unknown/uncomparable salaries. Chat preferences stay conversation-specific and do not overwrite profile preferences.
4. Personalization uses the latest feedback for each job, activates after three distinct jobs and caps adjustment at ±15% of base score. Ranking score is separate from match score. Rejecting location must not be treated as rejecting technology.
5. No structured employment/education records exist. For this release AI may select/order registered factual blocks and verified skills, but cannot introduce new prose claims. User edits are explicit user input; generated content is checked before persistence/display. Unsupported generated fields are dropped and logged. Structured career history is a later extension, not invented by the model.
6. Preserve existing job-based resume routes for compatibility and add unambiguous resume-id routes under `/api/resumes`. PDFs are server-rendered searchable text, using bundled Persian font, and regenerated from the persisted version.
7. Notification delivery is P2. Only actually persisted job preferences appear in settings. Existing Academy code remains for later work.

## Execution order

Document → OpenSpec proposal/design/specs/tasks → backend contracts → frontend flow → regression/unit/integration/build checks → evidence and remaining external validation.

## Release validation limits

Mocked provider and database tests establish behavior, not live-provider availability. A release smoke test still needs a migrated PostgreSQL database and configured provider/AI credentials. Do not mark live discovery or the entire MVP operational without that evidence. Funnel metrics have no numerical targets in the supplied PRD; product targets remain to be defined.
