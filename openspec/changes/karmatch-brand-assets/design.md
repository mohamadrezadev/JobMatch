## Context

The supplied artwork contains three transparent wordmarks and one opaque square app icon. Current BrandLogo assumes a square SVG and callers add the old product name.

## Goals / Non-Goals

Goals: reuse approved artwork, responsive variant selection, readable tagline and accessible icon metadata.

Non-goals: redraw artwork, offline functionality, backend or internal identifier changes.

## Decisions

BrandLogo gains `icon`, `wordmark`, `full` and `vertical` variants with correct intrinsic dimensions. Wordmark/full variants receive a pale backing because dark navy lettering disappears on dark backgrounds. Use actual PNG exports rather than approximating the logo in SVG. Export via the already installed Next image pipeline's Sharp dependency; no new runtime dependency.

Use horizontal full logo on landing and vertical full logo on auth. Navigation uses wordmark at desktop widths, icon at mobile widths. Next metadata references multiple favicon sizes and Apple icon; a typed manifest supplies 192/512 icons, including a separate safely padded maskable K export.

## Risks / Trade-offs

Raster lettering at tiny sizes → reserve full logos for larger areas, use K on mobile navigation. A manifest alone is not offline PWA functionality → explicitly record this scope. Source alpha glows/margins → inspect exports and browser screenshots; retain original artwork colors.

## Migration Plan

Ship static assets and callers together. Browser favicon caches can retain old artwork until a reload. No database migration. Rollback by restoring previous frontend assets/components.

## Open Questions

None blocking. Vector originals could improve future high-resolution print exports.
