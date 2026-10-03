# JM-FE-0001: Auth Pages PRD

## Problem
Users need to register and login to access personalized features like job matching and resume generation. The frontend must provide intuitive auth flows with proper error handling and session management.

## Scope
- Login page with email/password form
- Register page with name/email/password form
- Protected route wrapper for dashboard pages
- Auth state management with Zustand
- API client integration with JWT handling
- Form validation with React Hook Form + Zod
- Error display (validation errors, server errors)
- Loading states during auth operations

## Out Of Scope
- Social login buttons
- Remember me functionality
- Forgot password flow
- Email confirmation
- Session persistence beyond refresh token
- OAuth flows

## Affected Routes
- `/login` (public)
- `/register` (public)
- All `/dashboard/*` routes (protected)

## UI Requirements

### Login Page
- Email input field
- Password input field
- Submit button ("Login")
- Link to register page
- Error message display area
- Loading state on submit

### Register Page
- First name input
- Last name input
- Email input field
- Password input field (with strength indicator)
- Confirm password field
- Submit button ("Create Account")
- Link to login page
- Error message display area
- Loading state on submit

### Protected Routes
- Redirect unauthenticated users to `/login?returnTo=<current-path>`
- Show loading spinner while checking auth state
- Preserve intended destination for post-login redirect

## API Integration

### Auth Store (Zustand)
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
```

### API Client Integration
- Attach access token to all authenticated requests
- Handle 401 responses by attempting token refresh
- Clear auth state on logout
- Store refresh token in HTTP-only cookie (handled by backend)

## Authentication Flow

1. User visits protected route
2. App checks auth state via `checkAuth()`
3. If not authenticated, redirect to `/login?returnTo=/dashboard/jobs`
4. After successful login, redirect to intended destination
5. On token expiration, attempt silent refresh
6. If refresh fails, redirect to login

## Acceptance Criteria
- [ ] Can register with valid data and see success message
- [ ] Registration with duplicate email shows error
- [ ] Can login with valid credentials and access dashboard
- [ ] Login with invalid credentials shows appropriate error
- [ ] Unauthenticated user redirected to login when accessing dashboard
- [ ] Protected routes show loading state during auth check
- [ ] Token refresh works silently without user intervention
- [ ] Logout clears session and redirects to login
- [ ] Forms validate on submit (required fields, email format, password match)
- [ ] Password strength indicator shown on register page