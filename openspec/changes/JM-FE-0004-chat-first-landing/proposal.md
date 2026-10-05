# JobMatch chat-first landing

## Problem
The root showed a sample dashboard and anonymous chat redirected to login. Visitors need a real conversation as their first experience.

## Scope
Replace the homepage with a JobMatch landing containing the active chat, a responsive brand header, concise benefit/step sections and FAQs. Remove the sample dashboard route by redirecting /dashboard to /. Keep the existing fonts, colors and themes. Guest users can start without registration; authenticated users see their real chat. At the five-message limit, show login and registration actions while preserving messages and the unsubmitted draft. Successful auth routes to /chat and imports the guest conversation.

## API Contract
Use public GET /api/chat/guest, POST /api/chat/guest/message and guarded POST /api/chat/guest/claim with credentials. The server's remaining/authRequired fields govern the allowance. Existing authenticated message/history endpoints stay unchanged.

## Acceptance Criteria
Root has no sample statistics or fabricated persona. Root and /chat support anonymous sending. Quota survives reload. Failed sends preserve the draft; failed restore offers retry. After either login or registration, the same transcript and pending draft appear and can continue. Mobile has no horizontal overflow; themes remain persistent. Landing copy describes supported behavior without claiming live search execution.
