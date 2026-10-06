# Pre-commit validation

No required coverage gate or configured threshold was found. The 95% skill target is advisory here; source-level coverage remains below it. No pre-change report is available for regression comparison. Browser and database integration checks are separate from Jest unit coverage.

| File | Lines | Branches | Functions | Result |
|---|---:|---:|---:|---|
| frontend/src/types/chat.ts | N/A | N/A | N/A | NOT REPORTED |
| frontend/src/types/job.ts | N/A | N/A | N/A | NOT REPORTED |
| backend/src/modules/chat/chat.module.ts | 0 | 0 | 0 | BELOW 95% |
| backend/src/modules/chat/presentation/guest-chat.controller.ts | 0 | 0 | 0 | BELOW 95% |
| backend/src/modules/job-discovery/infrastructure/prisma-discovery.repository.ts | 0 | 0 | 0 | BELOW 95% |
| backend/src/modules/job-discovery/job-discovery.module.ts | 0 | 0 | 0 | BELOW 95% |
| frontend/src/app/(auth)/layout.tsx | 0 | 100 | 0 | BELOW 95% |
| frontend/src/app/(auth)/login/page.tsx | 0 | 0 | 0 | BELOW 95% |
| frontend/src/app/(auth)/register/page.tsx | 0 | 0 | 0 | BELOW 95% |
| frontend/src/app/(dashboard)/profile/page.tsx | 0 | 0 | 0 | BELOW 95% |
| frontend/src/app/(dashboard)/settings/page.tsx | 0 | 0 | 0 | BELOW 95% |
| frontend/src/app/error.tsx | 0 | 100 | 0 | BELOW 95% |
| frontend/src/app/layout.tsx | 0 | 100 | 0 | BELOW 95% |
| frontend/src/app/manifest.ts | 0 | 100 | 0 | BELOW 95% |
| frontend/src/components/landing/LandingPage.tsx | 0 | 0 | 0 | BELOW 95% |
| frontend/src/components/layout/AuthFrame.tsx | 0 | 0 | 0 | BELOW 95% |
| frontend/src/components/matching/MatchScore.tsx | 0 | 0 | 0 | BELOW 95% |
| frontend/src/components/ui/Card.tsx | 0 | 100 | 0 | BELOW 95% |
| frontend/src/lib/use-auth-ready.ts | 0 | 0 | 0 | BELOW 95% |
| frontend/src/pwa/service-worker.js | 0 | 0 | 0 | BELOW 95% |
| backend/src/modules/chat-runs/chat-run.service.ts | 46.55 | 15.78 | 40.9 | BELOW 95% |
| frontend/src/components/pwa/PwaControls.tsx | 53.09 | 47.82 | 42.3 | BELOW 95% |
| frontend/src/components/pathly/ResumeStudio.tsx | 63.39 | 75 | 66.66 | BELOW 95% |
| backend/src/modules/jobs/jobs.service.ts | 65.38 | 54.05 | 42.85 | BELOW 95% |
| backend/src/modules/job-discovery/application/discovery.ports.ts | 75 | 100 | 0 | BELOW 95% |
| backend/src/modules/matching/matching.service.ts | 75 | 0 | 60 | BELOW 95% |
| frontend/src/components/pathly/JobsView.tsx | 78.52 | 85.71 | 54 | BELOW 95% |
| frontend/src/components/pathly/DashboardView.tsx | 79.31 | 19.04 | 41.66 | BELOW 95% |
| frontend/src/components/chat/RunActivity.tsx | 79.48 | 70.42 | 70.58 | BELOW 95% |
| frontend/src/components/pathly/AccountWorkspace.tsx | 80 | 100 | 50 | BELOW 95% |
| frontend/src/lib/pathly-data.ts | 80 | 75 | 60 | BELOW 95% |
| frontend/src/components/chat/ChatExperience.tsx | 82.4 | 75 | 60 | BELOW 95% |
| backend/src/modules/chat/application/chat.service.ts | 85.71 | 100 | 50 | BELOW 95% |
| backend/src/modules/chat/infrastructure/model-context.service.ts | 87.75 | 68.85 | 91.66 | BELOW 95% |
| frontend/src/components/chat/GuestChat.tsx | 89.23 | 76.56 | 84.21 | BELOW 95% |
| backend/src/modules/job-discovery/infrastructure/source-validator.ts | 90.1 | 71.76 | 83.33 | BELOW 95% |
| backend/src/modules/job-discovery/infrastructure/nine-router-job-discovery.provider.ts | 92 | 76.47 | 100 | BELOW 95% |
| backend/src/modules/job-discovery/application/job-discovery.service.ts | 93.65 | 78.78 | 85.71 | BELOW 95% |
| backend/src/modules/job-discovery/infrastructure/agents-job-content.extractor.ts | 93.75 | 77.77 | 100 | BELOW 95% |
| backend/src/modules/job-discovery/application/agent-search.service.ts | 94.23 | 85.96 | 92 | BELOW 95% |
| frontend/src/components/pathly/PathlyShell.tsx | 95.12 | 86.66 | 90.9 | BELOW 95% |
| backend/src/modules/chat/domain/context.service.ts | 95.17 | 85.98 | 88.88 | BELOW 95% |
| backend/src/modules/job-discovery/domain/job-normalizer.ts | 96.32 | 86.11 | 96.29 | BELOW 95% |
| backend/src/modules/job-discovery/domain/discovery.ts | 96.55 | 93.67 | 93.1 | BELOW 95% |
| backend/src/modules/chat/application/guest-chat.service.ts | 97.22 | 97.22 | 85.71 | BELOW 95% |
| backend/src/modules/matching/domain/match.ts | 97.72 | 92.55 | 95 | BELOW 95% |
| backend/src/modules/chat/application/guest-discovery.service.ts | 100 | 73.33 | 100 | BELOW 95% |
| backend/src/modules/chat/domain/chat-reply.ts | 100 | 83.33 | 100 | BELOW 95% |
| backend/src/modules/chat/domain/conversation.ts | 100 | 100 | 100 | PASS |
| backend/src/modules/chat/domain/guest-conversation.ts | 100 | 100 | 100 | PASS |
| backend/src/modules/chat/domain/open-role.ts | 100 | 100 | 100 | PASS |
| backend/src/modules/job-discovery/application/agent-planner.service.ts | 100 | 90.9 | 100 | BELOW 95% |
| frontend/src/components/pathly/Icon.tsx | 100 | 66.66 | 100 | BELOW 95% |
| frontend/src/components/ui/BrandLogo.tsx | 100 | 65.38 | 100 | BELOW 95% |
| frontend/src/lib/guest-chat-client.ts | 100 | 100 | 100 | PASS |

## Passing checks

- Backend: 282 unit tests, 27 suites; production build succeeded.
- Frontend: 69 unit tests, 15 suites; production build succeeded during page delivery.
- Integration: 23 tests, including PostgreSQL and HTTP/SSE suites enabled.
- Latest account-page browser check: profile/skills persistence, clearing optional fields, preferences, selected resume job, 24 responsive light/dark screenshots.
- Staged credential-pattern scan: no findings. Diagnostic artifacts, test screenshots, environment files and generated build metadata are excluded.

Coverage commands: backend `pnpm exec jest --runInBand --coverage --coverageReporters=json-summary --coverageReporters=text-summary --silent`; frontend uses the same command plus `--collectCoverageFrom=src/**/*.{ts,tsx,js}` (quote the glob in PowerShell).
