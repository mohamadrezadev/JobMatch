# Pre-commit coverage review — 2026-10-06

174 backend and 46 frontend tests passed with coverage. The suggested 95% per-file target is not met. No mandatory coverage gate is configured in this repository; this report accompanies the user-authorized commit. No pre-change coverage baseline was captured, so regressions cannot be quantified.

Backend total: lines 48.56%, branches 55.96%, functions 45.99%. Frontend total: lines 79.21%, branches 68.95%, functions 62.8%. Totals cover different file sets and are not comparable. Frontend collection measures imported modules; files missing from its report are explicitly unmeasured.

| Changed source | Lines | Branches | Functions | Target | Uncovered line samples |
| --- | --- | --- | --- | --- | --- |
| backend/src/app.module.ts | 0% | 100% | 100% | FAIL | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| backend/src/modules/analytics/analytics.module.ts | 0% | 100% | 0% | FAIL | 1, 2, 3, 4, 5, 9, 10, 14, 15, 17, 18, 24 |
| backend/src/modules/auth/auth.service.ts | 0% | 0% | 0% | FAIL | 1, 6, 7, 8, 12, 14, 15, 19, 22, 24, 25, 41 |
| backend/src/modules/chat-runs/chat-run.service.ts | 0% | 0% | 0% | FAIL | 1, 8, 9, 10, 11, 12, 13, 19, 20, 29, 30, 31 |
| backend/src/modules/dashboard/dashboard.module.ts | 0% | 0% | 0% | FAIL | 1, 2, 3, 4, 5, 6, 10, 12, 13, 16, 17, 27 |
| backend/src/modules/feedback/feedback.service.ts | 0% | 0% | 0% | FAIL | 1, 6, 10, 11, 14, 15, 16, 17, 18, 28, 35, 39 |
| backend/src/modules/jobs/domain/recommendation.ts | 100% | 81.48% | 100% | FAIL |  |
| backend/src/modules/jobs/dto/jobs.dto.ts | 100% | 100% | 75% | FAIL | 24 |
| backend/src/modules/jobs/infrastructure/skill-search.ts | 100% | 0% | 100% | FAIL | 18 |
| backend/src/modules/jobs/jobs.controller.ts | 0% | 100% | 0% | FAIL | 1, 10, 11, 12, 13, 16, 17, 19, 20, 23, 24, 28 |
| backend/src/modules/jobs/jobs.service.ts | 63.46% | 48.27% | 35.71% | FAIL | 13, 16, 17, 18, 32, 49, 89, 94, 107, 122, 123, 124 |
| backend/src/modules/matching/domain/match.ts | 94.73% | 86.66% | 88.23% | FAIL | 21, 120, 138 |
| backend/src/modules/matching/matching.service.ts | 0% | 0% | 0% | FAIL | 1, 2, 3, 6, 7, 9, 17, 18, 20, 25, 28, 29 |
| backend/src/modules/resume/dto/resume.dto.ts | 0% | 100% | 100% | FAIL | 1, 10, 12, 15, 16, 21, 26 |
| backend/src/modules/resume/integrity.ts | 100% | 100% | 100% | PASS |  |
| backend/src/modules/resume/pdf.ts | 100% | 50% | 100% | FAIL | 15 |
| backend/src/modules/resume/resume.controller.ts | 0% | 100% | 0% | FAIL | 1, 12, 13, 14, 15, 19, 20, 23, 24, 28, 29, 33 |
| backend/src/modules/resume/resume.module.ts | 0% | 100% | 100% | FAIL | 1, 2, 3, 9 |
| backend/src/modules/resume/resume.service.ts | 44.92% | 25% | 52.63% | FAIL | 33, 46, 50, 52, 53, 57, 79, 81, 85, 86, 96, 97 |
| backend/src/modules/users/dto/onboarding.dto.ts | 0% | 100% | 0% | FAIL | 1, 2, 16, 19, 20, 23, 24, 25, 26, 27, 28, 29 |
| backend/src/modules/users/dto/preferences.dto.ts | 0% | 100% | 100% | FAIL | 1, 2, 3, 4, 5, 6 |
| backend/src/modules/users/dto/users.dto.ts | 100% | 100% | 100% | PASS |  |
| backend/src/modules/users/onboarding.controller.ts | 0% | 100% | 0% | FAIL | 1, 2, 3, 4, 5, 9, 10, 12, 16 |
| backend/src/modules/users/users.controller.ts | 0% | 100% | 0% | FAIL | 1, 11, 12, 13, 14, 15, 19, 20, 23, 24, 28, 32 |
| backend/src/modules/users/users.module.ts | 0% | 100% | 100% | FAIL | 1, 2, 3, 4, 11 |
| backend/src/modules/users/users.service.ts | 47.05% | 17.64% | 35.71% | FAIL | 15, 29, 30, 34, 35, 36, 37, 41, 42, 47, 50, 53 |
| frontend/src/app/(auth)/layout.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/app/(auth)/login/page.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/app/(auth)/register/page.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/app/(dashboard)/academy/page.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/app/(dashboard)/dashboard/page.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/app/(dashboard)/onboarding/page.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/app/(dashboard)/profile/page.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/app/(dashboard)/settings/page.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/app/layout.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/app/manifest.ts | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/components/chat/ChatExperience.tsx | 84.31% | 75% | 58.06% | FAIL | 18, 19, 44, 57, 76, 79, 81, 87, 88, 116, 151, 162 |
| frontend/src/components/chat/GuestChat.tsx | 90.9% | 80.95% | 91.66% | FAIL | 34, 39, 69, 188, 189 |
| frontend/src/components/landing/LandingPage.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/components/layout/Navbar.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/components/pathly/DashboardView.tsx | 78.57% | 12.5% | 41.66% | FAIL | 37, 47, 63, 96, 120, 136, 153 |
| frontend/src/components/pathly/JobsView.tsx | 79.86% | 84.16% | 55.1% | FAIL | 78, 79, 82, 83, 84, 85, 86, 87, 88, 89, 106, 107 |
| frontend/src/components/pathly/PathlyShell.tsx | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/components/pathly/ResumeStudio.tsx | 59.55% | 68.47% | 61.29% | FAIL | 68, 76, 96, 108, 118, 128, 129, 130, 131, 132, 133, 135 |
| frontend/src/components/ui/BrandLogo.tsx | 100% | 70% | 100% | FAIL |  |
| frontend/src/lib/analytics.ts | 75% | 100% | 50% | FAIL | 8 |
| frontend/src/lib/api-client.ts | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/lib/pathly-data.ts | 70% | 56.25% | 40% | FAIL | 85, 86, 109 |
| frontend/src/stores/useAuthStore.ts | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/stores/useResumeDraftStore.ts | 100% | 100% | 100% | PASS |  |
| frontend/src/types/job.ts | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |
| frontend/src/types/user.ts | unmeasured | unmeasured | unmeasured | Not established | Missing unit coverage |

Suggested follow-up: database-backed tests for profile/preferences/skill changes and JSON skill filtering; auth rotation and dashboard/analytics ownership/error paths; resume generation provider failures and PDF persistence/version races; UI onboarding validation, session hydration, pagination/filter changes and API failure/retry paths. Existing browser checks verify brand/layout and the controlled MVP journey but do not contribute to Jest unit coverage.
