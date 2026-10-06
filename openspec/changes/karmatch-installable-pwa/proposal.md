## Why

KarMatch has branding/manifest but lacks installation guidance, an offline fallback and controlled service worker updates. Users need a reliable app launch experience on mobile.

## What Changes

- Add installation/help UI, offline state and explicit update activation.
- Add a production service worker for public assets and a Persian offline document.
- Generate worker version from production build id and configure worker response headers.

## Capabilities

### New Capabilities
- `installable-pwa`: Installation guidance, public offline shell and controlled updates.

### Modified Capabilities
None.

## Impact

Frontend root layout, new PWA client/UI, public offline page, service worker template/build script, Next headers and frontend build command. No backend dependencies or API changes.

## Problem

Mobile visitors have no install guidance or defined behavior when connectivity is lost.

## Scope

In: install/help, public fallback/cache, connectivity notice, controlled updates and tests. Out: private offline data, push, background sync, APK and deployment to an unspecified host.

## API Contract

`GET /sw.js` versioned build-generated JavaScript, no-store; `GET /offline.html` public offline document. Existing manifest remains at `/manifest.webmanifest`.

## Acceptance Criteria

Worker controls production localhost/HTTPS pages; failed navigations show offline fallback; API/private content stays outside Cache Storage; updates wait for user action; installation UI follows actual platform support; tests/build pass and physical-device/HTTPS checks are reported separately.
