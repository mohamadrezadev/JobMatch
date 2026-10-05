# Pre-commit coverage report

Coverage runs passed: 54 backend unit tests and 23 frontend unit tests. The previously verified HTTP integration suite has 8 passing tests and is not included in these unit coverage totals.

The recommended 95% per-file threshold is not met. No required coverage gate or project-specific threshold is configured. Coverage improvement is outstanding; no pre-change coverage report is available to determine regression. Generated/vendored assets, migrations and tests are excluded from this table. N/A denotes no executable metric or no report entry.

backend: lines 28.4%, branches 39.33%, functions 20.66% across the full source tree.
frontend: lines 42.59%, branches 46.1%, functions 30.66% across the full source tree.

| Changed source file | Lines | Branches | Functions | Verdict |
|---|---:|---:|---:|---|
| backend/src/app.module.ts | 0% | N/A | N/A | BELOW 95% |
| backend/src/modules/auth/auth.controller.ts | 0% | N/A | 0% | BELOW 95% |
| backend/src/modules/auth/auth.module.ts | 0% | N/A | N/A | BELOW 95% |
| backend/src/modules/auth/jwt.strategy.ts | 0% | 0% | 0% | BELOW 95% |
| backend/src/modules/chat/chat.module.ts | 0% | N/A | 0% | BELOW 95% |
| backend/src/modules/chat/index.ts | 0% | N/A | 0% | BELOW 95% |
| backend/src/modules/chat/presentation/chat-exception.filter.ts | 0% | 0% | 0% | BELOW 95% |
| backend/src/modules/chat/presentation/chat.controller.ts | 0% | N/A | 0% | BELOW 95% |
| backend/src/modules/chat/presentation/guest-chat.controller.ts | 0% | 0% | 0% | BELOW 95% |
| backend/src/modules/matching/matching.service.ts | 0% | 0% | 0% | BELOW 95% |
| backend/src/modules/resume/resume.service.ts | 0% | 0% | 0% | BELOW 95% |
| backend/src/prisma/prisma.module.ts | 0% | N/A | N/A | BELOW 95% |
| frontend/src/app/(auth)/layout.tsx | 0% | N/A | 0% | BELOW 95% |
| frontend/src/app/(auth)/login/page.tsx | 0% | 0% | 0% | BELOW 95% |
| frontend/src/app/(auth)/register/page.tsx | 0% | 0% | 0% | BELOW 95% |
| frontend/src/app/(dashboard)/academy/page.tsx | 0% | N/A | 0% | BELOW 95% |
| frontend/src/app/(dashboard)/dashboard/page.tsx | 0% | N/A | 0% | BELOW 95% |
| frontend/src/app/(dashboard)/jobs/[id]/page.tsx | 0% | N/A | 0% | BELOW 95% |
| frontend/src/app/(dashboard)/jobs/page.tsx | 0% | N/A | 0% | BELOW 95% |
| frontend/src/app/(dashboard)/layout.tsx | 0% | N/A | 0% | BELOW 95% |
| frontend/src/app/(dashboard)/onboarding/page.tsx | 0% | 0% | 0% | BELOW 95% |
| frontend/src/app/(dashboard)/profile/page.tsx | 0% | 0% | 0% | BELOW 95% |
| frontend/src/app/(dashboard)/resume/page.tsx | 0% | N/A | 0% | BELOW 95% |
| frontend/src/app/(dashboard)/settings/page.tsx | 0% | N/A | 0% | BELOW 95% |
| frontend/src/app/layout.tsx | 0% | N/A | 0% | BELOW 95% |
| frontend/src/app/page.tsx | 0% | N/A | 0% | BELOW 95% |
| frontend/src/components/landing/LandingPage.tsx | 0% | 0% | 0% | BELOW 95% |
| frontend/src/components/layout/Navbar.tsx | 0% | 0% | 0% | BELOW 95% |
| frontend/src/components/layout/Sidebar.tsx | 0% | 0% | 0% | BELOW 95% |
| frontend/src/components/pathly/DashboardView.tsx | 0% | 0% | 0% | BELOW 95% |
| frontend/src/components/pathly/DemoNotice.tsx | 100% | 0% | 100% | BELOW 95% |
| frontend/src/components/pathly/PathlyShell.tsx | 0% | 0% | 0% | BELOW 95% |
| frontend/src/components/ui/BrandLogo.tsx | 100% | 0% | 100% | BELOW 95% |
| frontend/src/components/ui/Button.tsx | 0% | 0% | 0% | BELOW 95% |
| frontend/src/components/ui/Card.tsx | 0% | N/A | 0% | BELOW 95% |
| frontend/src/components/ui/Input.tsx | 0% | 0% | 0% | BELOW 95% |
| frontend/src/stores/useThemeStore.ts | 0% | 0% | 0% | BELOW 95% |
| frontend/src/lib/pathly-data.ts | 66.66% | 28.57% | 20% | BELOW 95% |
| backend/src/modules/chat/infrastructure/prisma-guest-conversation.repository.ts | 74.19% | 70% | 44.44% | BELOW 95% |
| backend/src/modules/chat/application/chat.service.ts | 84.61% | 100% | 50% | BELOW 95% |
| frontend/src/components/chat/ChatExperience.tsx | 83.33% | 70.76% | 50% | BELOW 95% |
| frontend/src/components/pathly/AcademyView.tsx | 66.66% | 100% | 50% | BELOW 95% |
| frontend/src/components/pathly/ResumeStudio.tsx | 65.38% | 61.9% | 53.33% | BELOW 95% |
| frontend/src/components/pathly/JobsView.tsx | 85.48% | 86.56% | 59.25% | BELOW 95% |
| frontend/src/components/pathly/Icon.tsx | 100% | 60% | 100% | BELOW 95% |
| backend/src/modules/chat/domain/context.service.ts | 88.49% | 79.77% | 76.47% | BELOW 95% |
| frontend/src/stores/useChatStore.ts | 86.04% | 81.48% | 77.77% | BELOW 95% |
| frontend/src/components/chat/GuestChat.tsx | 90.9% | 79.48% | 91.66% | BELOW 95% |
| backend/src/modules/chat/application/guest-chat.service.ts | 95.45% | 94.11% | 83.33% | BELOW 95% |
| backend/src/modules/chat/domain/chat-reply.ts | 100% | 83.33% | 100% | BELOW 95% |
| frontend/src/components/pathly/AcademyLesson.tsx | 100% | 90% | 100% | BELOW 95% |
| backend/src/modules/chat/application/conversation.repository.ts | 100% | N/A | N/A | PASS |
| backend/src/modules/chat/application/guest-conversation.repository.ts | 100% | N/A | N/A | PASS |
| backend/src/modules/chat/domain/conversation.ts | 100% | N/A | 100% | PASS |
| backend/src/modules/chat/domain/guest-conversation.ts | 100% | N/A | N/A | PASS |
| backend/src/modules/chat/infrastructure/prisma-conversation.repository.ts | 100% | 100% | 100% | PASS |
| backend/src/modules/chat/presentation/send-message.dto.ts | 100% | N/A | N/A | PASS |
| frontend/src/app/(dashboard)/chat/page.tsx | 100% | N/A | 100% | PASS |
| frontend/src/lib/guest-chat-client.ts | 100% | 100% | N/A | PASS |
| frontend/src/stores/useResumeDraftStore.ts | 100% | 100% | 100% | PASS |
| frontend/src/types/chat.ts | N/A | N/A | N/A | N/A |

Commands: backend `pnpm run test:cov --runInBand --coverageReporters=json-summary --coverageReporters=text-summary`; frontend `pnpm exec jest --runInBand --coverage --collectCoverageFrom=src/**/*.{ts,tsx} --coverageReporters=json-summary --coverageReporters=text-summary`.

Suggested next tests: guest controller cookie/origin/rate/error branches; guest repository CAS and expired-session cleanup; authenticated claim retry and account switching; landing/navigation/theme rendering; remaining auth/profile/resume API success and failure paths. Unit coverage does not include standalone browser checks or HTTP integration coverage.
