# KarMatch PWA MVP

2026-10-06. User authorized implementation after reviewing installation, offline fallback and controlled update scope.

## Behavior

- Existing manifest/K icons remain application identity. Add Apple standalone metadata and viewport theme color.
- A visible install/help entry is available globally. A native install action is offered only when the browser supplies `beforeinstallprompt`; iPhone/iPad show Share → Add to Home Screen guidance. Installed standalone windows hide install UI.
- Production-only root service worker. Cache only approved public brand assets, offline document and immutable Next static JS/CSS/fonts. Never cache online HTML, RSC payloads, API requests, authenticated requests or downloaded resumes.
- Full navigations use the network. On connection failure show an independent Persian offline page; it explains that chat/job search/resume generation need internet and offers retry. Existing open pages show connectivity state.
- New workers wait. A visible update action warns about unsaved edits, sends activation only after explicit click, and reloads that tab once on controller change. Other tabs keep their in-memory state until refreshed. No automatic reload during typing.
- Each production build generates `/sw.js` with the actual Next build id. Keep worker HTTP caching disabled. Bound public runtime cache to 80 entries and remove old KarMatch PWA caches after activation.

## Delivery and verification

Deploy using `pnpm --dir frontend run build` (includes worker generation), then `start`, on HTTPS. Localhost is suitable for automated service worker tests. Do not deploy an unbuilt public folder or cache `/sw.js` at a CDN. No service worker is registered in development.

The root Turborepo build output list includes `public/sw.js` so a cached frontend build restores the worker alongside `.next`. The installed Turbo 2.11.7 bundled task/output documentation was used for this configuration.

Browser tests cover actual worker registration/control, offline fallback, reconnection, native-install UI events, iOS guidance, installed-window behavior, API non-caching, and waiting-worker update activation. Desktop Chromium emulation cannot certify installation on physical iPhone/Android: perform those acceptance checks on the final HTTPS domain.

No push notifications, background search, private offline data, queued form submissions or APK packaging in this MVP.

References: [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps), [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
