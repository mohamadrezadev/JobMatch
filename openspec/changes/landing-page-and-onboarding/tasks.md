## 1. Landing Page

- [ ] 1.1 Create `frontend/src/app/page.tsx` with hero section — headline, tagline, three feature cards (Find / Understand / Improve), and CTA buttons linking to `/register` and `/login`
- [ ] 1.2 Style the landing page with Tailwind following mobile-first responsive breakpoints; ensure all key content is above the fold on ≥1280px viewports
- [ ] 1.3 Add the landing page route to the root layout so it renders without any auth or dashboard wrapper

## 2. Onboarding Wizard

- [ ] 2.1 Create `frontend/src/app/(dashboard)/onboarding/page.tsx` with a four-step wizard component
- [ ] 2.2 Implement Step 1 — Basic Info: fields for firstName, lastName, targetRole (e.g., "Junior .NET Developer")
- [ ] 2.3 Implement Step 2 — Experience: fields for yearsOfExperience, education, currentEmploymentStatus
- [ ] 2.4 Implement Step 3 — Skills: dynamic list allowing users to add skills with level selector (Beginner / Intermediate / Advanced)
- [ ] 2.5 Implement Step 4 — Preferences: fields for location, workType (Remote/On-site/Hybrid), desiredSalaryMin
- [ ] 2.6 Enforce sequential navigation — each step's "Next" button SHALL be disabled until all required fields pass validation
- [ ] 2.7 Persist partial progress to `useAuthStore` via Zustand `persist` middleware so reloading restores the current step and form data

## 3. Profile Completion Gate

- [ ] 3.1 Extend `useAuthStore` with `isProfileComplete` boolean and `completeOnboarding()` action that sets it to `true`
- [ ] 3.2 On successful submission of the final onboarding step, call `PUT /api/users/profile` with the collected data and set `isProfileComplete = true` in the store
- [ ] 3.3 Create `frontend/src/middleware.ts` using Next.js Middleware — intercept requests to `(dashboard)/` routes and check a cookie `profile_complete`; redirect to `/onboarding` if false
- [ ] 3.4 Set the `profile_complete` cookie in the backend after profile completion (via response header or dedicated endpoint)

## 4. Navbar Profile Indicator

- [ ] 4.1 In `Navbar.tsx`, conditionally render a non-blocking "Complete your profile" banner when `!isProfileComplete`
- [ ] 4.2 The banner SHALL link to `/onboarding` and SHALL be hidden once `isProfileComplete === true`
- [ ] 4.3 Ensure the banner does not disrupt the main navigation on narrow viewports
