## ADDED Requirements

### Requirement: Assigned artwork variants
The application SHALL display the supplied full logo and tagline on auth and landing/product introduction, the supplied wordmark on desktop header/sidebar, and only K on mobile navigation.

#### Scenario: Desktop visitor
- **WHEN** a visitor opens landing or login on desktop
- **THEN** the full logo includes the supplied Persian tagline
- **AND** desktop header uses the wordmark without tagline.

#### Scenario: Mobile navigation
- **WHEN** navigation renders at mobile width
- **THEN** its brand graphic is the K icon.

### Requirement: Readable accessible branding
The application SHALL preserve artwork proportions and provide accessible brand names and readable navy lettering in both themes.

#### Scenario: Dark theme
- **WHEN** the visitor uses dark theme
- **THEN** wordmarks have a light backing with readable name and tagline.

#### Scenario: Asset request failure
- **WHEN** an image cannot load
- **THEN** its alternative text identifies KarMatch and includes the tagline for full variants.

### Requirement: Browser and application icons
The application SHALL expose K favicon PNGs, Apple touch icon and a web manifest with 192/512 application icons and a maskable icon.

#### Scenario: Browser reads metadata
- **WHEN** the browser loads the site metadata and manifest
- **THEN** referenced icons resolve to valid images of declared sizes
- **AND** application name is KarMatch.
