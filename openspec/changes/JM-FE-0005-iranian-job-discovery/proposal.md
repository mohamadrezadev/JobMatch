# Iranian opportunities in chat

## Problem
Users cannot act on prepared search preferences in chat, and ordinary job views may show sample opportunities.

## Scope (In/Out)
In: automatic discovery after authenticated search turns, owned result restoration, job cards, honest missing-data labels, loading/error/partial/empty states, retry, source/detail links, guest registration CTA and landing copy. Out: new matching/resume behavior, redesigning the approved theme or guest limits.

## API Contract
Send only conversationId to the discovery API. Preserve chat and drafts independently of discovery failures. Ignore responses after owner/context changes. GET latest restores history without an automatic new search. POST uses a seventy-second client timeout.

## Acceptance Criteria
Authenticated ready search turns begin discovery once. Cards show real persisted results, source, work type and salary with unknowns explicit. Empty/failure states never fall back to samples. Guests can continue their five messages and receive a login/register CTA when their role is known. Design samples require explicit development preview.
