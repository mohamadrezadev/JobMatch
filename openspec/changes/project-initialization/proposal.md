## Why

Pathly is a monorepo project for an AI Career Copilot targeted at junior developers. Currently there are no implementation files — only an architecture document in `docs/architecture.md`. The goal is to scaffold the full monorepo (NestJS backend + Next.js frontend) and initialize OpenSpec so the team can track features through structured proposals → specs → design → tasks.

## What Changes

- Scaffold NestJS backend with Prisma, PostgreSQL, JWT auth, and all modules described in the architecture doc
- Scaffold Next.js 15 frontend with TypeScript, Tailwind, Zustand stores, and all routes/pages from the architecture
- Configure Turborepo + pnpm workspaces for shared scripts across monorepo
- Initialize OpenSpec with the `spec-driven` schema to manage future feature changes

## Capabilities

### New Capabilities
- `backend`: NestJS API server — auth, users, skills, jobs, matching, resume generation, feedback modules with Prisma ORM on PostgreSQL
- `frontend`: Next.js 15 application — auth pages, dashboard, profile, jobs browse/search, matching view, resume preview, settings
- `monorepo-infrastructure`: Turborepo build pipeline + pnpm workspaces + shared tsconfig + root scripts (dev, build, lint, test)
- `openspec-setup`: OpenSpec configuration and initial change tracking for this project

### Modified Capabilities
_(none)_

## Impact

**Files created:** All backend and frontend source files, root config files (`package.json`, `turbo.json`, `pnpm-workspace.yaml`, `.gitignore`), Dockerfile, and OpenSpec artifact files.
**Dependencies added:** NestJS ecosystem, Prisma, PostgreSQL driver, Next.js, React 19, Zustand, Tailwind, OpenAI SDK, JWT libraries, Turborepo, pnpm.
**Systems affected:** None external to the project; database will be PostgreSQL (local Docker Compose recommended).
