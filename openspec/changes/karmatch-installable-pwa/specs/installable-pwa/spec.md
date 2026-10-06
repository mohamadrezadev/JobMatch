## ADDED Requirements

### Requirement: Progressive installation
The application SHALL offer native installation only when supported by a received install event, provide iOS/manual instructions otherwise, and hide install UI in installed display modes.

#### Scenario: Native browser prompt
- **WHEN** beforeinstallprompt arrives and the visitor selects install
- **THEN** the saved event is prompted once
- **AND** dismissal or prompt failure leaves understandable retry/manual guidance.

#### Scenario: iOS installation
- **WHEN** an iPhone/iPad visitor opens installation help
- **THEN** Safari Share and Add to Home Screen instructions are displayed.

#### Scenario: Installed launch
- **WHEN** the app runs in standalone display mode
- **THEN** installation UI is hidden.

### Requirement: Public offline fallback
The production worker SHALL cache only public assets and an offline page, never online HTML, RSC, private API responses or resumes.

#### Scenario: Failed navigation
- **WHEN** a controlled full navigation fails because the network is unavailable
- **THEN** a Persian offline page explains online-only features and offers retry.

#### Scenario: Private response
- **WHEN** an API or authenticated response is received
- **THEN** it is not added to worker Cache Storage.

### Requirement: Controlled updates
The application SHALL version workers by production build, display a waiting update and activate/reload only after that tab's explicit user action.

#### Scenario: New build
- **WHEN** a new worker finishes installing while an old worker controls the app
- **THEN** it waits and the update UI is displayed
- **AND** typing is not interrupted by automatic reload.

#### Scenario: Apply update
- **WHEN** the visitor chooses update
- **THEN** the waiting worker activates, clears only old owned caches and the requesting tab reloads once.

### Requirement: Production delivery
The application SHALL generate the worker during the production build, serve it without HTTP caching and register it only in production secure contexts.

#### Scenario: Production build
- **WHEN** the documented build command succeeds
- **THEN** sw.js contains the actual build id and declared offline files exist.

#### Scenario: Development or unsupported context
- **WHEN** the app runs in development or without service worker support
- **THEN** it remains usable without registering a worker.
