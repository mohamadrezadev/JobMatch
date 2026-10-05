# Career Copilot chat page

## Problem

Candidates need a chat entry point without a completed profile.

## Scope

In: authenticated /chat, navigation, conversation history/selection, new conversation, Persian accessible composer, errors and search readiness.
Out: streaming, anonymous chat, discovery results and resume execution.

## API Contract

Use existing authenticated API client with POST /api/chat/message, GET /api/chat/conversations and GET /api/chat/conversations/:id. Success is { success, data }. Server context is authoritative.

## Acceptance Criteria

- Signed-out users redirect to login; no profile completeness gate.
- Sends show persisted history and context.
- History can be restored after reload.
- Errors preserve drafts for retry.
- Pending requests prevent overlapping sends/switches.
- Keyboard and mobile users can access all controls.
- Display readiness without fabricated search results.
