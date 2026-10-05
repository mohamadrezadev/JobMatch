# Pre-commit coverage report

2026-10-05. Backend: 148 unit tests passed. Frontend: 32 unit tests passed. Coverage collected from passing runs. There is no configured required coverage gate; the advisory 95% per-file target is not met. Pre-change coverage was not collected, so regression comparisons are unavailable.

Commands: backend `pnpm run test:cov -- --runInBand --coverageReporters=json-summary --coverageReporters=lcov --coverageReporters=text-summary`; frontend `pnpm exec jest --runInBand --coverage --coverageReporters=json-summary --coverageReporters=lcov --coverageReporters=text-summary`. Existing commands were used without introducing a new project configuration.

| File | Lines | Branches | Functions | Result |
| --- | --- | --- | --- | --- |
| backend/src/modules/job-discovery/infrastructure/prisma-discovery.repository.ts | 0% | 0% | 0% | BELOW TARGET |
| backend/src/modules/job-discovery/infrastructure/nine-router.client.ts | 87.75% | 86.53% | 100% | BELOW TARGET |
| backend/src/modules/job-discovery/infrastructure/nine-router-job-discovery.provider.ts | 91.01% | 68.42% | 100% | BELOW TARGET |
| backend/src/modules/chat/domain/context.service.ts | 92.1% | 82.41% | 83.33% | BELOW TARGET |
| backend/src/modules/job-discovery/application/job-discovery.service.ts | 92.85% | 75% | 83.33% | BELOW TARGET |
| backend/src/modules/job-discovery/domain/discovery.ts | 93.33% | 85.36% | 94.73% | BELOW TARGET |
| backend/src/modules/job-discovery/domain/job-normalizer.ts | 95.23% | 83.78% | 95.45% | BELOW TARGET |
| frontend/src/stores/useDiscoveryStore.ts | 95.55% | 73.52% | 100% | BELOW TARGET |
| backend/src/modules/job-discovery/application/discovery.ports.ts | 100% | 100% | 100% | PASS |

Types, module wiring, generated/schema/migration files and manual integration utilities are not all meaningfully measured by unit instrumentation. Uncollected files are explicitly listed rather than assigned invented percentages. Integration HTTP/database tests, builds and the compiled npm handler verifier passed separately.

Remaining test work: remaining normalizer and repository/application failure branches; ordinary jobs/matching/resume behavior with nullable discovered fields; component interaction branches for restored/error/partial states; and full live four-source acceptance after provider enforcement. Unit coverage is not evidence of remote redirect/egress enforcement.
