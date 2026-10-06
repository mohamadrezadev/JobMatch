## Context

Next 15 App Router frontend already exposes manifest and K assets. No worker/install UI exists. Authenticated HTML and API data must not be cached as a side effect of install support.

## Goals / Non-Goals

Goals: progressive installation/help, independent offline fallback, bounded public caching and user-driven update.

Non-goals: full offline React navigation, offline private data, push, background sync, framework upgrade or deployment without a named target.

## Decisions

Use browser service worker APIs directly for the small explicit cache policy; a broad offline plugin would introduce more Next/RSC caching behavior than this scope needs. Worker template lives outside public; a post-build script combines it with `.next/BUILD_ID` and writes ignored `public/sw.js`. Root client registers production-only with updateViaCache none. Headers disable HTTP caching of worker and offline document.

Offline fallback is standalone HTML with inline CSS/script and a cached K icon, so it does not depend on Next chunks. Navigations are network-only with fallback on thrown network errors; successful/error online HTML is never stored. Strict public-path/extension allowlist excludes API, RSC/query payloads, non-GET, cross-origin and Authorization-bearing requests. Static cache max 80 entries. A new worker deletes only older caches with the KarMatch prefix.

Global PwaControls provides a small install entry, accessible dialog, offline status and waiting-update action. Native prompt is used only when received; iOS/macOS-touch iPad detection provides Safari guidance. Installed standalone/fullscreen windows suppress installation UI. Controllerchange reload requires this tab's explicit update choice; other tabs are not reloaded automatically.

## Risks / Trade-offs

Stale cached chunks after deployment → cache keyed by build id and worker waits for consent. Third-party/CDN worker caching → no-store headers and documented deployment requirement. Browser prompts depend on engagement/platform → honest help fallback and event-driven native action. Mobile OS behavior cannot be certified in Chromium → record physical-device HTTPS acceptance separately.

## Migration Plan

Build frontend via package script, deploy full output/public together on HTTPS. For rollback or retirement, serve a replacement worker at the same URL that removes owned caches and unregisters; merely deleting the script is insufficient for already-installed clients.

## Open Questions

Production domain/host and physical-device access are not provided; implementation and local production checks proceed independently.
