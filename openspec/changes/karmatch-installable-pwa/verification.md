# PWA verification — 2026-10-06

## Completed

- Frontend TypeScript check and production build passed. Build generated `public/sw.js` containing the actual `.next/BUILD_ID`; generated worker is ignored by Git and reproduced by the build command.
- Frontend regression/unit tests: **58 tests / 14 suites passed**, including 12 new cases for install fallback/iOS/installed state/dismissal/failure/connectivity and worker private-request exclusion, navigation fallback, cache directives, explicit activation, owned cleanup, cache limit and storage failure.
- Pre-commit coverage rerun: all 58 tests passed. PwaControls unit coverage: lines 53.09%, branches 47.82%, functions 42.3%; below the suggested 95% target. Production registration/update paths are exercised by the real-browser suite rather than this Jest run. Worker VM tests do not instrument its template for coverage; root layout/build configuration are unmeasured. No mandatory coverage threshold is configured. Coverage is not presented as complete or as a passing 95% gate.
- `node frontend/scripts/verify-pwa.cjs` passed against the production Next server, using an isolated local HTTP proxy origin. Tests used an actual Chromium service worker and real browser Cache Storage. A controlled private API returned HTTP 200 with a marker; no API/private document entered worker caches.
- Real worker registration/control; delivery no-store header/build id; waiting replacement worker; user-selected activation/reload; old owned cache removal; unrelated cache retention; and unsaved email preserved in the second tab all passed.
- Actual network disconnection showed an in-page status and the public offline page on full `/profile` navigation. Retry after reconnect returned to the app. Screenshots captured locally under `frontend/test-results/pwa` and inspected for mobile layout/readability.
- Native install event dismissal and installed-state UI were simulated in Chromium. iPhone user-agent guidance and layout were verified in Chromium; this is not a physical iOS installation test.
- Existing brand browser regression passed after global PWA UI integration.
- Turbo 2.11.7 installed bundled docs were read before editing build outputs. A `turbo run build --filter=jobmatch-frontend --dry=json` confirmed `public/sw.js` is in cached outputs and the command runs worker generation. Actual Turbo cache-hit restoration was not exercised.
- Strict OpenSpec validation and diff whitespace checks passed. Structural graph freshness/coverage checked; index is stale/new code untracked, so current source/generated files supplied evidence.

## External acceptance still needed

No production host/domain or physical-device access was supplied. Deploy the production build on HTTPS, verify worker headers are not overridden by the CDN, then test actual Android installation and Safari Share → Add to Home Screen on iPhone/iPad. Verify standalone launch, account restoration, keyboard layout, PDF download/source links and update across an actual deployment. No deployment or mobile OS install is claimed here.

Offline support is a public fallback and public asset cache. It does not provide offline conversations, stored private resumes, background search, queued submissions or notifications.
