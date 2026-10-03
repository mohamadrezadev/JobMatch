## 1. Monorepo scaffolding

- [x] 1.1 Create root `package.json` with workspace scripts (`dev`, `build`, `lint`, `test`)
- [x] 1.2 Create root `turbo.json` defining pipeline stages for each workspace
- [x] 1.3 Create root `pnpm-workspace.yaml` with `packages: ['backend', 'frontend']`
- [x] 1.4 Create root `tsconfig.base.json` shared across workspaces
- [x] 1.5 Create root `.gitignore` covering node_modules, .next, dist, .turbo
- [x] 1.6 Create `backend/package.json` with NestJS, Prisma, Passport-JWT, bcrypt, OpenAI deps
- [x] 1.7 Create `frontend/package.json` with Next.js 15, React 19, TypeScript, Tailwind, Zustand deps
- [x] 1.8 Create `backend/tsconfig.json` extending root base config
- [x] 1.9 Create `frontend/tsconfig.json` extending root base config
- [x] 1.10 Create `backend/.env.example` and `frontend/.env.example` with documented variables

## 2. Backend — Prisma schema & database

- [x] 2.1 Write `backend/src/prisma/schema.prisma` with User, Profile, Skill, UserSkill, Job, Matching, Resume, Feedback models
- [x] 2.2 Run `prisma migrate dev` to create initial migration and seed the database
- [x] 2.3 Generate Prisma client (`prisma generate`)
- [x] 2.4 Seed script to populate sample Skills and Jobs data

## 3. Backend — Core modules

- [x] 3.1 Create `app.module.ts` with PrismaService, JwtModule, and CORS configuration
- [x] 3.2 Create `main.ts` entry point bootstrapping the NestJS app
- [x] 3.3 Implement Auth module — `auth.controller.ts`, `auth.service.ts`, `auth.module.ts` with register/login/refresh/me endpoints
- [x] 3.4 Implement Users module — `users.controller.ts`, `users.service.ts`, `users.module.ts` with profile CRUD and skills endpoints
- [x] 3.5 Implement Skills module — CRUD for skill catalog if needed (admin-facing, read-only for now)
- [x] 3.6 Implement Jobs module — `jobs.controller.ts`, `jobs.service.ts`, `jobs.module.ts` with list/search/recommended endpoints
- [x] 3.7 Implement Matching module — `matching.controller.ts`, `matching.service.ts`, `matching.module.ts` calling OpenAI for score & gaps
- [x] 3.8 Implement Resume module — `resume.controller.ts`, `resume.service.ts`, `resume.module.ts` generating and serving PDFs
- [x] 3.9 Implement Feedback module — `feedback.controller.ts`, `feedback.service.ts`, `feedback.module.ts` for job feedback storage

## 4. Backend — Common infrastructure

- [x] 4.1 Create `common/decorators/` — `@CurrentUser()` decorator for extracting user from JWT
- [x] 4.2 Create `common/guards/` — `JwtAuthGuard` using Passport strategy and `RolesGuard` if needed
- [x] 4.3 Create `common/interceptors/` — `TransformInterceptor` for consistent API response shape
- [x] 4.4 Create `common/pipes/` — `ParseUUIDPipe` and custom validation pipes
- [x] 4.5 Create `Dockerfile` for backend with multi-stage build

## 5. Frontend — App shell & layout

- [x] 5.1 Create `frontend/src/app/layout.tsx` with root metadata, font, and HTML structure
- [x] 5.2 Create `frontend/src/app/(auth)/layout.tsx` for auth route group
- [x] 5.3 Create `frontend/src/app/(dashboard)/layout.tsx` with Navbar + Sidebar components
- [x] 5.4 Configure Tailwind in `tailwind.config.ts` with theme tokens (colors, spacing, typography)
- [x] 5.5 Install and configure `next/font` for typography

## 6. Frontend — Auth pages

- [x] 6.1 Create `frontend/src/app/(auth)/login/page.tsx` with email/password form
- [x] 6.2 Create `frontend/src/app/(auth)/register/page.tsx` with registration form
- [x] 6.3 Create `frontend/src/stores/useAuthStore.ts` with Zustand slice for session state
- [x] 6.4 Create `frontend/src/lib/api-client.ts` with axios instance using cookie-based auth

## 7. Frontend — Dashboard pages

- [x] 7.1 Create `frontend/src/app/(dashboard)/page.tsx` dashboard home with recommended jobs summary
- [x] 7.2 Create `frontend/src/app/(dashboard)/profile/page.tsx` with profile edit form
- [x] 7.3 Create `frontend/src/app/(dashboard)/jobs/page.tsx` with job list, filters, pagination
- [x] 7.4 Create `frontend/src/app/(dashboard)/jobs/[id]/page.tsx` with job detail, match score, skill gaps
- [x] 7.5 Create `frontend/src/app/(dashboard)/resume/page.tsx` with resume preview and PDF download button
- [x] 7.6 Create `frontend/src/app/(dashboard)/settings/page.tsx` with settings form
- [x] 7.7 Create `frontend/src/app/(dashboard)/onboarding/page.tsx` with four-step onboarding wizard

## 8. Frontend — Shared components

- [x] 8.1 Create `frontend/src/components/ui/` — Button, Input, Card, Badge, Skeleton components
- [x] 8.2 Create `frontend/src/components/layout/Navbar.tsx` and `Sidebar.tsx`
- [x] 8.3 Create `frontend/src/components/jobs/JobCard.tsx` and `JobFilters.tsx`
- [x] 8.4 Create `frontend/src/components/matching/MatchScore.tsx` and `SkillGapBadge.tsx`
- [x] 8.5 Create `frontend/src/components/resume/ResumePreview.tsx`

## 9. Frontend — Types & stores

- [x] 9.1 Create `frontend/src/types/user.ts`, `job.ts`, and `index.ts` barrel exports
- [x] 9.2 Create `frontend/src/stores/useJobsStore.ts` for jobs cache and filtering state
- [x] 9.3 Add `next.config.js` with API proxy or correct basePath for backend communication
