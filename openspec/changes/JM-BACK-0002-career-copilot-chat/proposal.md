# Career Copilot backend

## Problem

PRD-001 requires candidates to express job searches conversationally without a completed profile, while preserving history and preventing fabricated facts.

## Scope

In: authenticated owned conversations, history, seven intents, Persian/English extraction for supported phrases, incremental corrections, source-backed candidate assertions separate from preferences.
Out: anonymous sessions, Hermes execution, job results, resume execution, automatic writes to Profile/UserSkill, and general-purpose LLM understanding.

## API Contract

- POST /api/chat/message: { conversationId?: UUID, message: string }; response { success: true, data: { conversationId, message, intent, searchContext, candidateFacts, readyForSearch } }.
- GET /api/chat/conversations: owned summaries, latest first.
- GET /api/chat/conversations/:id: owned context and ordered history.
- Errors: { success: false, error: { code, message } }, HTTP 400/401/404/409.
- Message: 1–4000 characters, nonblank; foreign conversation returns 404.

## Acceptance Criteria

- Role alone makes the request ready. Work type and salary are optional.
- PRD Backend + Node + remote + 15 toman example extracts 15,000,000 TOMAN.
- Later corrections preserve unrelated context.
- Skill denials update facts without changing search preferences.
- Original candidate statements are retained; experience, companies and proficiency are never inferred.
- Context and message pair commit atomically. Stale updates return 409.
- History and writes are scoped to the authenticated owner.

## What Changes

Layered NestJS chat module; Prisma models/migration at actual schema location backend/src/prisma/schema.prisma; deterministic extraction with explicit supported vocabulary; validation, Swagger, ownership and unit tests.
