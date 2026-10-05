# Design

The reference's actual implementation is a single static HTML document inside an iframe. Port its dashboard and academy sections by deterministic HTML-to-JSX conversion, preserving original Tailwind classes. The import utility accepts a source path and rejects unexpected inline handlers. Navigation becomes Next.js links, and interactions become React state.

PathlyShell owns the sidebar, mobile navigation and ambient background. Native feature components own jobs, academy, chat and resume. Existing auth/API stores remain the source of truth. Theme persists separately under the same pathly_theme key as the reference.

Use the exact reference color palette and locally bundled Vazirmatn weights 300–900 and Font Awesome 6.4. Avoid changing framework versions to achieve the same visuals.

Copy the source HTML into design-reference for provenance only. It is not the deployed UI. The comparison server can serve this source using the project's local CSS/fonts so visual inspection does not require external CDNs.

Mock dashboard/academy statistics are explicitly design samples. Anonymous job and resume samples preserve the reference appearance, with visible sample labels. Signed-in jobs use server responses; failures never silently turn into fabricated matches. Resume drafts reset across owners and pull only actual profile/skill fields. Original project history exists only in the labelled anonymous sample.

The existing test suite has no e2e framework. Use a standalone browser smoke/visual check without scaffolding an e2e framework. Browser plugin bootstrap failed due to the Windows sandbox ACL infrastructure; use the installed headless browser for local comparison if available.
