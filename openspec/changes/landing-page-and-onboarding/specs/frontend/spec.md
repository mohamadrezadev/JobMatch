## ADDED Requirements

### Requirement: Landing page MUST be publicly accessible at the root route
The app SHALL render a public Landing Page when a visitor navigates to `/`. The page SHALL display the product tagline, three core value propositions (Find, Understand, Improve), and two primary CTAs: "Get Started" linking to `/register` and "Sign In" linking to `/login`. No authentication SHALL be required.

#### Scenario: visit landing page unauthenticated
- **GIVEN** an unauthenticated visitor opens the app
- **WHEN** they navigate to `/`
- **THEN** the Landing Page SHALL load without redirecting to any auth flow

#### Scenario: CTAs direct to correct routes
- **GIVEN** the Landing Page is rendered
- **WHEN** the user clicks "Get Started"
- **THEN** the browser SHALL navigate to `/register`

---

### Requirement: Landing page MUST communicate product value within 3 seconds
The page SHALL present the headline, a one-sentence explanation, and visual feature cards (Find Jobs · Understand Fit · Close Gaps · Apply) above the fold without requiring scroll on standard desktop viewports (≥ 1280px).

#### Scenario: above-the-fold visibility
- **GIVEN** a viewport of 1280×800
- **WHEN** `/` loads
- **THEN** the hero text and all four feature icons SHALL be visible without scrolling

---

### Requirement: Onboarding wizard MUST enforce sequential four-step flow
A user SHALL complete four steps in order: Step 1 (Basic Info: name, target role), Step 2 (Experience: years, education), Step 3 (Skills: add skills with level), Step 4 (Preferences: location, work type, salary). Steps SHALL be blocked from skipping; the user SHALL only proceed after valid input in the current step.

#### Scenario: complete all steps
- **GIVEN** a newly registered user accessing `/onboarding`
- **WHEN** they fill out all four steps in order and submit
- **THEN** `isProfileComplete` SHALL become `true` and the app SHALL redirect to the dashboard

#### Scenario: cannot skip steps
- **GIVEN** the user is on Step 2
- **WHEN** they attempt to click "Next" without filling experience data
- **THEN** the button SHALL remain disabled and a validation message SHALL appear

---

### Requirement: Onboarding progress MUST persist across reloads
The wizard SHALL save the current `onboardingStep` value (0–4) and partial form data to `useAuthStore` via `persist` middleware on every step change, so the user can return to `/onboarding` and resume where they left off.

#### Scenario: reload mid-onboarding
- **GIVEN** the user completed Step 1 and left partial data in Step 2
- **WHEN** the browser is refreshed
- **THEN** the user SHALL land back on Step 2 with their previously entered data still filled in

---

### Requirement: Dashboard access MUST be gated behind profile completion
Any route within `(dashboard)/` SHALL be inaccessible until `isProfileComplete === true`. Users whose profile is incomplete SHALL be redirected to `/onboarding` via Next.js middleware.

#### Scenario: navigate to dashboard without profile
- **GIVEN** a logged-in user who has not completed onboarding
- **WHEN** they navigate to `/profile` or any dashboard route
- **THEN** the middleware SHALL redirect them to `/onboarding`

#### Scenario: authenticated complete user accesses dashboard
- **GIVEN** a logged-in user with `isProfileComplete === true`
- **WHEN** they navigate to `/`
- **THEN** the dashboard layout SHALL render normally

---

### Requirement: Navbar MUST display profile completion indicator
When `isProfileComplete === false`, the Navbar SHALL show a non-blocking badge or banner reading "Complete your profile" that links to `/onboarding`. When complete, the indicator SHALL be hidden.

#### Scenario: incomplete profile shows banner
- **GIVEN** an authenticated user mid-onboarding
- **WHEN** any dashboard page renders
- **THEN** the "Complete your profile" banner SHALL appear in the Navbar
