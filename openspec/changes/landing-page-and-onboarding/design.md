## Context

The product has no public entry point. Visitors currently can only reach `/login` or `/register` directly — there's no landing page to communicate value, no conversion path, and no guided onboarding for new users. The dashboard gate is also missing: any authenticated user can land on any dashboard route regardless of profile completeness.

## Goals / Non-Goals

**Goals:**
- Ship a compelling Landing Page that converts visitors into registered users
- Enforce Onboarding as a mandatory prerequisite before dashboard access
- Make the Onboarding wizard stateful with step persistence so users can resume later

**Non-Goals:**
- Rebuilding the existing auth pages
- Adding social login
- Implementing onboarding analytics beyond completion tracking

## Decisions

1. **Landing page route**: Use `app/page.tsx` at root (not inside a route group) so it's publicly accessible alongside `(auth)` and `(dashboard)` groups.
2. **Onboarding as separate step, not inline edit**: Users SHALL complete the wizard in a dedicated flow; this prevents partial data from polluting the dashboard.
3. **Profile gate via Next.js middleware**: Use `frontend/src/middleware.ts` to check `isProfileComplete` from Zustand store (read from localStorage on server via cookies or session) before allowing access to `(dashboard)/*`.
4. **Step persistence**: Store `onboardingStep: 0–4` in `useAuthStore` via `persist` middleware; the step number persists across reloads.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Middleware can't read client-side Zustand state | Persist onboarding progress to a cookie; middleware reads cookie |
| Users bypass onboarding by typing URL | Middleware guard on all `(dashboard)/` routes covers this |
| Landing page adds bundle size | Use dynamic import for hero section components if needed; keep initial JS lean |
