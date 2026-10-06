# Verification and release status

2026-10-06. Implementation follows the supplied PRD → gap analysis → OpenSpec change → code order.

## Evidence

- Baseline: 152 backend unit tests and 43 frontend tests passed before edits.
- Final backend unit suite: 174 tests across 21 suites. Covers unknown match components, work type, salary units, preferred skill weights, distinct-feedback threshold/latest decisions/caps, server-filter conditions and query validation, atomic onboarding callback failures, all-field generated-claim rejection, owned resume edits and actual Persian PDF bytes with Unicode font mapping.
- Frontend suite: 46 tests across 12 suites. Added server-pagination/filter/rejection interaction, actual empty dashboard data and restoration/edit of saved resumes; retained chat/run/discovery regression tests.
- HTTP/database integration: 22 tests passed across 4 suites, with no skips. Includes real Nest validation, JWT/guards and HTTP endpoints with controlled repositories/services, plus opt-in PostgreSQL discovery/run suites enabled with `JOB_DISCOVERY_DB_TEST=true` and `CHAT_RUN_DB_TEST=true`. Covers search validation, incomplete onboarding rejection, binary PDF attachment, database persistence and existing run/discovery transaction behavior. Provider responses in integration tests are controlled.
- Browser: `frontend/scripts/verify-mvp-completion.cjs` passed against the local app using API fixtures. Covers zero-year onboarding payload, names and skills, filters/pagination, rejection reason, dashboard, saved resume edit/reload/download, mobile navigation without Academy, and API failure visibility. Uses the existing Playwright/Chrome standalone verification convention, no new browser framework.
- Backend/Frontend TypeScript checks passed. Nest build and Next production build passed. Prisma validate/generate passed. OpenSpec validate passed.
- Code graph coverage was checked for relied-on source paths. The index was stale/new files were untracked and tests excluded, so conclusions and edits relied on current source reads rather than completeness claims from the graph.

## Remaining live release gate

The additive migration was successfully applied to the configured PostgreSQL database at `127.0.0.1:5433`. No database reset or seed/demo job injection was performed.

`backend/scripts/verify-mvp-live.cjs` registered an ordinary temporary account, persisted atomic onboarding, and ran the existing Persian chat discovery against the real configured provider. The run ended `PARTIAL` and persisted one valid source-backed job. The temporary account was removed; real discovered jobs were retained. The first smoke stopped on an incorrect test assumption that the result must contain `.NET`; the script now checks an explicit skill from the returned job instead.

Subsequent attempts were blocked by PostgreSQL connectivity: `pathly-postgres` exited, was restarted, and then Docker Desktop's Linux engine became unavailable again. Registration returned HTTP 500 and TCP port 5433 was unavailable. Live skill filtering, three-distinct-job personalization, AI resume generation, edit/login restoration and PDF download therefore remain unverified end to end. Their controlled unit/HTTP/browser checks passed; those checks do not substitute for the live release gate.

Once PostgreSQL and the existing provider configuration are running:

1. Restore stable PostgreSQL/Docker availability and confirm migration status; migrations have already been applied.
2. Run `node scripts/verify-mvp-live.cjs` from `backend` against the backend on port 3014, or set `JOBMATCH_API_URL`. This script uses real providers/models and removes only the exact account it creates.
3. Also verify a Persian follow-up and three distinct real job feedbacks; a live response with fewer than three jobs cannot establish the personalization threshold. Open the original source URL.
4. Inspect generated-claim removal logs, actual PDF rendering and persisted dashboard/events after logout/login. Define numerical funnel targets with product stakeholders.

The full MVP is **not declared operational** until this live journey passes.

## Deliberate MVP constraints

- AI selects/reorders exact registered factual blocks and verified skills. It does not freely rewrite candidate history. Explicit human edits are stored as user-authored claims. Self-reported facts are not independently verified employment/education records.
- Match score and personalized ranking score are separate; feedback activates after three distinct jobs with a ±15% base-score cap. Recommendation evaluates the stored collection in memory after batched reads; high-volume deployments will need precomputation/indexed candidate selection.
- Notification delivery, advanced learning, application tracking and structured career history remain future work. Settings expose persisted job preferences only.
- PDF files are written under `backend/storage/resumes` (ignored by Git), or `RESUME_PDF_DIR`, by resume id and version. Editing invalidates the stored path. Retention/cleanup of superseded PDFs is an operational follow-up.
- Authoritative search/chat funnel events cover the main ChatRun path; old direct discovery/chat endpoints retain compatibility but do not emit the new complete funnel.
