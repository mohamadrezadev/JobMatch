# Reference frontend delivery

The root dashboard comparison below records the original port. Change JM-FE-0004-chat-first-landing subsequently replaces the sample dashboard with the active JobMatch landing; the standalone verifier now checks that experience.

Reference: `C:\jobmath-master\jobmath-master\public\pathly.html`.
The original is preserved in `frontend/design-reference/pathly.html` for comparison. The application renders native React components, rather than an iframe.

## Implementation

- `frontend/src/components/pathly`: shared responsive shell, dashboard, jobs, academy and resume studio.
- Existing `/chat` uses the reference styling and the real Career Copilot API.
- Local Vazirmatn and Font Awesome 6.4 assets, reference colors, RTL layout, persistent dark/light themes and mobile navigation.
- Existing Next.js 15, Tailwind 3, authentication and backend contracts are retained.
- Reference statistics, jobs and resume content are explicitly marked as samples. Signed-in jobs use the API; resume drafts are scoped to their owner. Academy quizzes do not write unverified skills.
- Development uses `.next-dev`; production builds use `.next` so both can run without cache collisions.

## Validation

- Production build: passed; all application routes compiled.
- Frontend unit tests: 5 suites, 18 tests passed.
- OpenSpec strict validation: passed.
- Standalone Chrome checks: dashboard geometry agrees with the reference within 1 px; desktop/mobile, both themes and persistence, jobs filters and empty results, academy quiz, resume preview, authentication redirect and real authenticated Copilot message all passed.

Run the frontend with `pnpm --dir frontend run dev`; the development address is `http://localhost:3001`. The existing backend runs at `http://localhost:3100`.

Optional visual comparison uses `node scripts/serve-pathly-reference.cjs` and `node scripts/verify-pathly-design.cjs` from `frontend`, with the application and backend running and system Chrome installed. Screenshots are saved under the ignored `frontend/.visual-check/` directory. The verification script uses the local test account and sends one chat message.