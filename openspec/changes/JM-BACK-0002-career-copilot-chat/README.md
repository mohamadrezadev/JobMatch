# Career Copilot initial implementation

Source: openspec/prds/PRD-001-career-copilot-chat.md.
Related frontend change: JM-FE-0002-career-copilot-chat.

## Delivered
Owned persistent conversation repository, intent/context extraction for documented phrases, separate source-backed candidate statements, atomic message pairs, optimistic concurrency, protected API and /chat UI. Search readiness requires only a target role. No discovery results or resume execution are fabricated.

## Verification
- Both changes pass openspec validate <change-id> --strict.
- Backend: pnpm exec tsc --noEmit and pnpm exec nest build pass.
- Backend: pnpm exec jest --runInBand passes 45 unit tests.
- Backend: pnpm run test:integration --runInBand passes 5 HTTP/JWT tests (memory repository; no live PostgreSQL).
- Frontend: pnpm exec tsc --noEmit --incremental false and pnpm exec jest --runInBand pass, with 8 tests.
- Prisma schema validates and client generates. Validation used a temporary placeholder URL and made no database connection.

## Development setup
Configure backend environment from .env.example with a real DATABASE_URL and JWT/refresh secrets. From backend run:
1. pnpm exec prisma generate
2. pnpm exec prisma migrate deploy
3. pnpm run dev

From frontend run pnpm run dev and open /chat after login. Run commands from each workspace directly. Chat does not require an OpenAI key; the existing resume feature still does when used.

## Remaining
Both migrations are now deployed to isolated local PostgreSQL. Live registration/login, chat creation, preference correction and persisted history have been verified over HTTP. Interactive browser verification remains open. The extractor is deliberately bounded; arbitrary role/company/location extraction and LLM career answers are not implemented in this initial phase. Candidate statements are user assertions, not independently verified credentials, and are not written into Profile/UserSkill.

## Running local services
Frontend: http://localhost:3001/chat
Backend API: http://localhost:3100/api/docs
Database: dedicated pathly-postgres container on 127.0.0.1:5433, using jobmatch-dev-pgdata volume.
Local ignored env files contain generated auth secrets and the API URL. Other services using 3000 and 5432 were left running.

The previous duplicate root routes prevented Next.js routing. Dashboard moved to /dashboard, while the landing page remains at /. Dashboard navigation links were updated.