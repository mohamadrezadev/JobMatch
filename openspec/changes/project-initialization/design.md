## Context

Pathly is a monorepo with a NestJS backend (PostgreSQL + Prisma) and a Next.js 15 frontend. No source code exists yet — both `backend/` and `frontend/` directories are empty. The architecture document in `docs/architecture.md` defines the full API surface, data models, and page structure. OpenSpec has just been initialized to track this first implementation work.

## Goals / Non-Goals

**Goals:**
- Scaffold the complete monorepo with working dev servers on both sides
- Create all NestJS modules with Prisma services wired to the schema from the architecture doc
- Create all Next.js pages and components matching the route group structure
- Configure authentication (JWT + bcrypt) end-to-end
- Integrate OpenAI API for resume generation and matching score calculation
- Set up the database with a migration that covers User, Profile, Skill, Job, Matching, Resume, Feedback models

**Non-Goals:**
- Implementing real-time features (WebSockets)
- Adding payment or subscription billing
- Building an admin panel
- Setting up CI/CD pipelines in this initial change

## Decisions

1. **Monorepo tooling**: Use Turborepo + pnpm workspaces — standard for this stack, excellent caching, minimal config
2. **Database ORM**: Prisma — type-safe, great DX, migration support out of the box
3. **Auth strategy**: JWT stored in HttpOnly cookies (not localStorage) for XSS protection; bcrypt for password hashing
4. **Styling**: Tailwind CSS v3 with `shadcn/ui` pattern for reusable components
5. **State management**: Zustand — lightweight, works well with Next.js App Router
6. **AI integration**: OpenAI Chat Completions API via a dedicated service in the NestJS backend (frontend never calls AI directly)
7. **PDF generation**: `@react-pdf/renderer` server-side; the endpoint returns a rendered PDF blob

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| OpenAI API costs during development | Add rate limiting and mock fallback; use gpt-4o-mini by default |
| PostgreSQL not available locally | Provide Docker Compose with `postgres:16` service |
| JWT cookie cross-origin issues | Configure `cors.origin` in NestJS to include the frontend URL; set `sameSite: 'lax'` |
| Next.js App Router + Zustand hydration mismatch | Use `"use client"` directive explicitly on store-consuming components |
