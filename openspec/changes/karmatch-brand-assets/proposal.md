## Why

The supplied KarMatch artwork must replace the placeholder JobMatch logo consistently. Current square-only branding cannot express the requested header, full tagline and mobile variants.

## What Changes

- Export the four supplied PNG variants for the web with proportional sizing.
- Use full logos on auth/landing/product introduction, wordmark on desktop header/sidebar and K on mobile.
- Update public brand text and metadata; supply favicon, Apple touch and manifest icons.

## Capabilities

### New Capabilities
- `karmatch-brand`: Accessible, responsive application identity using approved assets.

### Modified Capabilities
None.

## Impact

Frontend brand component, landing, auth layout, navigation, public assets and application metadata. No API or database changes.

## Problem

Placeholder branding conflicts with the supplied name, logo and tagline.

## Scope

In: active public product branding and icon metadata. Out: offline service worker, redesign, package renaming and retired Academy screens.

## API Contract

No backend changes. Static assets under `/brand`, web manifest at `/manifest.webmanifest`.

## Acceptance Criteria

Supplied variants appear in their assigned places without distortion; names and tagline are readable in light/dark themes; mobile uses K; icons and manifest return valid files; type/build checks and browser checks pass.
