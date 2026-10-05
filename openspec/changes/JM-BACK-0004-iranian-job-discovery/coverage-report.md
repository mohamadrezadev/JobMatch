# Pre-commit coverage report

2026-10-05. Backend: 129 unit tests passed. Frontend: 29 unit tests passed. Coverage collected from passing runs. There is no configured required coverage gate; the advisory 95% per-file target is not met. Pre-change coverage was not collected, so regression comparisons are unavailable.

Commands: backend `pnpm run test:cov -- --runInBand --coverageReporters=json-summary --coverageReporters=lcov --coverageReporters=text-summary`; frontend `pnpm exec jest --runInBand --coverage --coverageReporters=json-summary --coverageReporters=lcov --coverageReporters=text-summary`. Existing commands were used without introducing a new project configuration.

| File | Lines | Branches | Functions | Result |
| --- | --- | --- | --- | --- |
| frontend/src/components/landing/LandingPage.tsx | Not collected | Not collected | Not collected | NOT COLLECTED |
| frontend/src/components/pathly/PathlyShell.tsx | Not collected | Not collected | Not collected | NOT COLLECTED |
| frontend/src/types/job.ts | Not collected | Not collected | Not collected | NOT COLLECTED |
| frontend/src/types/discovery.ts | Not collected | Not collected | Not collected | NOT COLLECTED |
| backend/src/app.module.ts | 0% | 100% | 100% | BELOW TARGET |
| backend/src/modules/jobs/jobs.controller.ts | 0% | 0% | 0% | BELOW TARGET |
| backend/src/modules/jobs/jobs.service.ts | 0% | 0% | 0% | BELOW TARGET |
| backend/src/modules/matching/matching.service.ts | 0% | 0% | 0% | BELOW TARGET |
| backend/src/modules/resume/resume.service.ts | 0% | 0% | 0% | BELOW TARGET |
| backend/src/modules/job-discovery/infrastructure/prisma-discovery.repository.ts | 0% | 0% | 0% | BELOW TARGET |
| backend/src/modules/job-discovery/job-discovery.module.ts | 0% | 0% | 0% | BELOW TARGET |
| backend/src/modules/job-discovery/presentation/job-discovery.controller.ts | 0% | 0% | 0% | BELOW TARGET |
| frontend/src/lib/pathly-data.ts | 57.14% | 14.28% | 20% | BELOW TARGET |
| frontend/src/components/chat/DiscoveryPanel.tsx | 72.22% | 41.66% | 37.5% | BELOW TARGET |
| frontend/src/components/chat/ChatExperience.tsx | 83.95% | 72.05% | 50% | BELOW TARGET |
| frontend/src/components/pathly/JobsView.tsx | 85.71% | 87.83% | 59.25% | BELOW TARGET |
| frontend/src/stores/useChatStore.ts | 86.36% | 77.41% | 77.77% | BELOW TARGET |
| backend/src/modules/job-discovery/infrastructure/nine-router-job-discovery.provider.ts | 89.18% | 68.42% | 100% | BELOW TARGET |
| backend/src/modules/job-discovery/infrastructure/source-validator.ts | 89.65% | 73.49% | 81.81% | BELOW TARGET |
| backend/src/modules/job-discovery/infrastructure/nine-router.client.ts | 90% | 86.95% | 100% | BELOW TARGET |
| frontend/src/components/chat/GuestChat.tsx | 90.9% | 80.95% | 91.66% | BELOW TARGET |
| backend/src/modules/job-discovery/domain/discovery.ts | 91.66% | 73.17% | 89.47% | BELOW TARGET |
| backend/src/modules/job-discovery/application/job-discovery.service.ts | 92.3% | 70% | 83.33% | BELOW TARGET |
| backend/src/modules/job-discovery/infrastructure/agents-job-content.extractor.ts | 93.75% | 77.77% | 100% | BELOW TARGET |
| frontend/src/stores/useDiscoveryStore.ts | 93.75% | 77.27% | 100% | BELOW TARGET |
| backend/src/modules/job-discovery/domain/job-normalizer.ts | 95.06% | 82.95% | 94.11% | BELOW TARGET |
| backend/src/modules/job-discovery/application/discovery.ports.ts | 100% | 100% | 100% | PASS |

Types, module wiring, generated/schema/migration files and manual integration utilities are not all meaningfully measured by unit instrumentation. Uncollected files are explicitly listed rather than assigned invented percentages. Integration HTTP/database tests, builds and the compiled npm handler verifier passed separately.

Remaining test work: direct unit coverage of the normalizer and repository/application failure branches; ordinary jobs/matching/resume behavior with nullable discovered fields; component interaction branches for restored/error/partial states; and full live four-source acceptance after provider enforcement. Unit coverage is not evidence of remote redirect/egress enforcement.
