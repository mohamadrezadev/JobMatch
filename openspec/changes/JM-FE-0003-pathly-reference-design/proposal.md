# Pathly reference frontend port

## Problem
The current frontend does not match the supplied reference at C:/jobmath-master/jobmath-master. That app renders public/pathly.html in an iframe; its design must become native frontend components in this repository.

## Scope
In: reference RTL Persian shell, Vazirmatn font, Font Awesome 6.4 icons, exact color tokens, dark/light themes, background glows, desktop/mobile navigation, dashboard, split job discovery, academy lessons, Copilot and resume editor/print preview; matching login/registration and existing profile/settings surfaces.
Out: backend feature expansion, fabricated user statistics, unverified resume claims, a migration to the reference's Next.js 16/Tailwind 4 stack.

## API Contract
Existing endpoints are retained. Chat uses /api/chat/* with its success/data envelope. Job discovery uses GET /api/jobs and /api/jobs/:id; match analysis uses POST /api/matching/:id. Resume generation uses POST /api/resume/generate. The adapter accepts existing bare responses and success/data envelopes without changing the backend.

## Acceptance Criteria
- Reference dashboard/academy markup becomes native typed React components, not an iframe.
- Local font/icon assets reproduce the reference without CDN runtime dependencies.
- Dark theme is the initial theme; changing theme persists through reload.
- All five sections have real routes and mobile navigation.
- Search includes titles, companies and skills; remote/hybrid filters and removable chips work.
- Anonymous sample data is explicitly labelled; authenticated jobs come from the API and failures/empty states remain visible.
- Chat still preserves history, ownership, drafts on failure and readiness.
- Resume fields update the preview and print view. A signed-in user starts with actual profile/skills, not reference credentials.
- Academy answers do not automatically create verified skills.
- TypeScript, applicable unit tests and browser smoke checks pass.

## Changes
Add components/pathly, theme and resume draft Zustand stores, local design assets, routes and an explicit reference import utility. Preserve the installed Next.js 15/Tailwind 3 stack and previous backend/chat work.
