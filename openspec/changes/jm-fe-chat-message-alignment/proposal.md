# Chat authors and physical alignment

## Problem
RTL flex direction reverses the intended user/assistant alignment. Pending messages and greetings use separate markup and authors are not consistently labelled.

## Scope
Shared chat message presentation across authenticated and guest history, greetings and pending sends. User messages appear physically right, assistant messages left; identify authors with labels, avatars and distinct surfaces. Label existing request activity as assistant work. No conversation/API contract changes.

## API Contract
Preserve roles, content, message IDs, run associations and pending state from existing stores and guest streaming. No new requests.

## Acceptance Criteria
- User messages are physically right and assistant messages physically left in RTL pages.
- Persian/English text keeps its natural reading direction inside each bubble.
- Author labels and icons distinguish both sides without relying only on color.
- Pending user sends follow the same placement and identify sending state.
- Assistant request activity is clearly attributed, preserving actual event details.
- Mobile and desktop layouts do not overflow.
