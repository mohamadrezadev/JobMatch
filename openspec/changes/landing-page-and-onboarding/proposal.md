## Why

PRD section 20 defines a public Landing Page as the entry point of the product, but the current architecture only has `/(auth)` and `/(dashboard)` route groups. There is no public-facing page, so visitors have nowhere to land before registering. Additionally, the PRD specifies an explicit Onboarding flow (basic info → experience → skills → preferences) that must be completed **before** users can access the dashboard — currently there is no such gate or wizard.

Without these two elements, the product loop described in PRD §22 cannot start: a visitor cannot enter the system at all, and a registered user cannot complete profile construction in a guided way.

## What Changes

- Add a public `LandingPage` route group (`/`) with hero copy, value proposition, and CTA buttons linking to `/register`
- Add an Onboarding wizard (`/onboarding`) that walks users through four sequential steps; the wizard SHALL persist progress to Zustand and block dashboard access until completion
- Add a middleware/guard on `/(dashboard)` routes that redirects incomplete-profile users to `/onboarding`
- Add a `ProfileCompletionStatus` indicator in the Navbar showing which onboarding steps remain

## Capabilities

### New Capabilities
- `landing-page`: Public homepage with product messaging, feature highlights, and navigation to auth flows
- `onboarding-wizard`: Four-step guided profile creation (Basic Info → Experience → Skills → Preferences); state persisted to `useAuthStore`; blocks dashboard until done
- `profile-gate`: Middleware enforcing profile-completion prerequisite before dashboard access

### Modified Capabilities
_(none)_

## Impact

**Frontend files added:** `app/page.tsx` (Landing), `app/(dashboard)/onboarding/page.tsx`, `src/components/onboarding/*` (step components + progress bar).
**Middleware added:** `frontend/src/middleware.ts` (Next.js Route Handler guarding dashboard paths).
**State extended:** `useAuthStore` gains `onboardingStep`, `completeOnboarding()`, `isProfileComplete`.
**No backend changes required.**
