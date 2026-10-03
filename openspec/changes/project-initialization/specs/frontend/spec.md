## ADDED Requirements

### Requirement: App layout & routing structure
The Next.js 15 app SHALL render a root layout (`app/layout.tsx`) and organize routes into two groups: `(auth)` for public pages (`/login`, `/register`) and `(dashboard)` for protected pages. The root layout SHALL provide the HTML shell and metadata for every page.

#### Scenario: navigate to root layout
- **GIVEN** the app is running on port 3000
- **WHEN** a browser requests `/`
- **THEN** the root `<html>` shell with proper metadata SHALL be returned

---

### Requirement: Login page
The `/login` route SHALL render an email/password form. On successful submission the page SHALL call `POST /api/auth/login`, persist the returned `accessToken` into Zustand `useAuthStore`, and redirect the user to the dashboard group. Invalid credentials SHALL display an inline error message.

#### Scenario: successful login
- **GIVEN** valid credentials for an existing user
- **WHEN** the login form is submitted
- **THEN** the app SHALL navigate to `/(dashboard)` and render the protected layout

#### Scenario: invalid credentials
- **GIVEN** a wrong password
- **WHEN** the login form is submitted
- **THEN** an error message SHALL appear below the password field and the user SHALL remain on the login page

---

### Requirement: Register page
The `/register` route SHALL render a registration form (email, password, firstName, lastName). On success it SHALL call `POST /api/auth/register`, store the tokens via `useAuthStore`, and redirect to the dashboard.

#### Scenario: valid registration
- **GIVEN** a unique email and a strong password
- **WHEN** the register form is submitted
- **THEN** the app SHALL redirect to the dashboard after the registration API returns success

---

### Requirement: Dashboard home
The root dashboard route (`/`) SHALL display a summary view for authenticated users: up to 5 recommended jobs fetched from `GET /api/jobs/recommended` and a compact profile snapshot card.

#### Scenario: first visit after login
- **GIVEN** a newly logged-in user with no browsing history
- **WHEN** `/` is accessed within the dashboard group
- **THEN** the page SHALL show an empty-state prompt encouraging the user to complete their profile

---

### Requirement: Profile page
The `/profile` route SHALL render a form pre-populated with the current user's profile data (title, bio, location, desired salary, experience level, work type, skills). Saving the form SHALL call `PUT /api/users/profile` and reflect the updated values.

#### Scenario: update bio
- **GIVEN** a logged-in user with an existing bio
- **WHEN** the user edits the bio field and clicks Save
- **THEN** the API SHALL return the updated profile and the UI SHALL display the new value immediately

---

### Requirement: Jobs listing page
The `/jobs` route SHALL fetch paginated jobs (`GET /api/jobs?page=1&limit=12`) and render each as a `JobCard` component showing title, company, location, and a work-type badge. Filter controls SHALL let the user narrow results by role, location, and work type.

#### Scenario: browse jobs
- **GIVEN** 30 jobs exist in the database
- **WHEN** `/jobs` is visited
- **THEN** exactly 12 job cards SHALL appear with pagination controls for subsequent pages

---

### Requirement: Job detail page
The `/jobs/[id]` route SHALL fetch the job details and call `POST /api/matching/<id>` to obtain the match score. It SHALL render a `MatchScore` gauge visualising the percentage and a `SkillGapBadge` list for every missing or weak skill.

#### Scenario: view matched job
- **GIVEN** a valid jobId and an authenticated user
- **WHEN** `/jobs/<uuid>` is opened
- **THEN** the match score gauge and skill gap badges SHALL be visible on the page

---

### Requirement: Resume page
The `/resume` route SHALL render a `ResumePreview` component populated with the most recently generated resume. A "Download PDF" button SHALL link to `GET /api/resume/<jobId>/pdf` to trigger a browser download.

#### Scenario: resume ready
- **GIVEN** a previously generated resume exists for the active job
- **WHEN** `/resume` is opened
- **THEN** the preview content and the download button SHALL both be visible

---

### Requirement: Settings page
The `/settings` route SHALL render controls for notification preferences and account management options accessible to authenticated users.

#### Scenario: access settings
- **GIVEN** an authenticated user
- **WHEN** `/settings` is visited
- **THEN** the settings UI SHALL load without errors

---

### Requirement: Zustand state persistence
Zustand stores (`useAuthStore`, `useJobsStore`) SHALL persist the session key in localStorage under the name `auth-storage`. After a browser reload the store SHALL restore `isAuthenticated` and the current user object so the app does not flash the auth layout.

#### Scenario: page reload preserves session
- **GIVEN** a logged-in user who refreshes the browser
- **WHEN** the app re-renders
- **THEN** `isAuthenticated` SHALL remain `true` and the dashboard layout SHALL render instead of the auth layout

---

### Requirement: Tailwind CSS styling
All components SHALL use Tailwind utility classes defined in `tailwind.config.ts`. Layouts SHALL follow a mobile-first responsive strategy using breakpoints sm (640px), md (768px), lg (1024px), xl (1280px). Color contrast SHALL meet WCAG 2.1 AA (ratio ≥ 4.5:1).

#### Scenario: responsive job card
- **GIVEN** the `JobCard` component rendered on a viewport narrower than 640px
- **WHEN** the browser window is resized below the `sm` breakpoint
- **THEN** the card layout SHALL collapse to a single-column mobile layout
