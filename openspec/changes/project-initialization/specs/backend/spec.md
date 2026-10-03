## ADDED Requirements

### Requirement: Auth register endpoint
The server SHALL hash the incoming password with bcrypt (12 rounds minimum), persist a new User row in PostgreSQL, sign an access JWT (1h expiry) and a refresh JWT (7-day expiry), and return the user object plus both tokens in a `success: true` response. Duplicate emails SHALL result in a 409 conflict. Weak passwords SHALL be rejected with a 400 error.

#### Scenario: valid registration
- **GIVEN** a fresh database with no existing users
- **WHEN** `POST /api/auth/register` is called with `email="dev@example.com"`, `password="SecurePass123!"`, `firstName="Ali"`, `lastName="Reza"`
- **THEN** the response SHALL be 201 with `data.id`, `data.email`, `accessToken`, and `refreshToken`; the user SHALL be stored in the database

#### Scenario: duplicate email
- **GIVEN** a user with `email="dev@example.com"` already exists
- **WHEN** `POST /api/auth/register` is called with the same email
- **THEN** the server SHALL respond with 409 Conflict

#### Scenario: weak password rejected
- **GIVEN** no existing user with the given email
- **WHEN** `POST /api/auth/register` is called with `password="123"`
- **THEN** the server SHALL reject with 400 Bad Request

---

### Requirement: Auth login endpoint
The server SHALL verify the supplied credentials against the hashed password in the database. On success it SHALL sign and return an access JWT (expires in 1 hour) and a refresh JWT (expires in 7 days). Wrong credentials SHALL produce a 401 Unauthorized response.

#### Scenario: correct credentials
- **GIVEN** a registered user with verified credentials
- **WHEN** `POST /api/auth/login` is called with matching email and password
- **THEN** the response SHALL contain `accessToken`, `refreshToken`, and `expiresIn` fields

#### Scenario: wrong password
- **GIVEN** a registered user
- **WHEN** `POST /api/auth/login` is called with an incorrect password
- **THEN** the server SHALL respond with 401 Unauthorized

---

### Requirement: Auth middleware protects routes
Routes decorated with the JwtAuthGuard SHALL require a valid Bearer token in the Authorization header. Missing, malformed, or expired tokens SHALL be rejected with 401.

#### Scenario: missing token
- **GIVEN** no Authorization header is present
- **WHEN** `GET /api/auth/me` is called
- **THEN** the server SHALL respond with 401 Unauthorized

#### Scenario: expired token
- **GIVEN** a bearer token whose lifetime has exceeded 1 hour
- **WHEN** `GET /api/auth/me` is called with that token
- **THEN** the server SHALL respond with 401 Unauthorized

---

### Requirement: Users CRUD endpoints
Authenticated users SHALL be able to read and update their own profile via `GET/PUT /api/users/profile` and manage their skills via `GET/POST/DELETE /api/users/skills`. The server SHALL enforce ownership — a user SHALL only access their own data. Unauthenticated requests SHALL receive 401.

#### Scenario: authenticated profile update
- **GIVEN** a logged-in user with a valid access token
- **WHEN** `PUT /api/users/profile` is called with updated title and bio
- **THEN** the server SHALL persist the changes and return the updated profile

#### Scenario: unauthenticated profile access
- **GIVEN** no valid token
- **WHEN** `GET /api/users/profile` is called
- **THEN** the response SHALL be 401

---

### Requirement: Jobs list & search endpoints
The server SHALL return paginated Job records from PostgreSQL. `GET /api/jobs` SHALL support `page` and `limit` query parameters; `POST /api/jobs/search` SHALL accept a keyword and filter by title/description. The response body SHALL include `items`, `total`, `page`, and `pages`.

#### Scenario: list jobs with pagination
- **GIVEN** 25 job records exist in the database
- **WHEN** `GET /api/jobs?page=1&limit=10` is called
- **THEN** the response SHALL contain exactly 10 items and `pages` equal to 3

#### Scenario: search by keyword
- **GIVEN** jobs with various titles and descriptions
- **WHEN** `POST /api/jobs/search` is called with `{keyword: "React"}`
- **THEN** only jobs whose title or description contains "React" SHALL be returned

---

### Requirement: Matching score endpoint
On `POST /api/matching/:jobId` the server SHALL compare the authenticated user's skills against the job's required skills, compute a numeric match score (0–100), and return the score together with a list of skill gaps. If the job does not exist the server SHALL return 404.

#### Scenario: full skill match
- **GIVEN** a user whose skills exactly cover all required job skills
- **WHEN** `POST /api/matching/<jobId>` is called
- **THEN** the match score SHALL be 100 and `skillGaps` SHALL be empty

#### Scenario: partial skill match
- **GIVEN** a user missing two of five required skills
- **WHEN** `POST /api/matching/<jobId>` is called
- **THEN** the match score SHALL be between 0 and 99 and `skillGaps` SHALL list the missing skills

---

### Requirement: Resume generation
On `POST /api/resume/generate` the server SHALL call the OpenAI Chat Completions API using GPT-4 (or gpt-4o-mini as configured), pass the user profile and job description as context, persist the generated resume text in the database, and return the new resume ID. A missing or invalid jobId SHALL result in a 404 error.

#### Scenario: successful generation
- **GIVEN** a valid jobId and an authenticated user with a complete profile
- **WHEN** `POST /api/resume/generate` is called
- **THEN** the response SHALL contain a new resume ID and a content preview

#### Scenario: missing job
- **GIVEN** an invalid or non-existent jobId
- **WHEN** `POST /api/resume/generate` is called
- **THEN** the server SHALL respond with 404 Not Found

---

### Requirement: Resume PDF download
On `GET /api/resume/:jobId/pdf` the server SHALL render the stored resume using `@react-pdf/renderer` and return the resulting PDF stream with `Content-Type: application/pdf`. If no resume has been generated for the jobId the server SHALL return 404.

#### Scenario: PDF available
- **GIVEN** a previously generated resume for the jobId
- **WHEN** `GET /api/resume/<jobId>/pdf` is called
- **THEN** the response SHALL be a valid PDF file with correct Content-Type header

#### Scenario: resume not yet generated
- **GIVEN** a jobId with no associated resume
- **WHEN** `GET /api/resume/<jobId>/pdf` is called
- **THEN** the server SHALL respond with 404

---

### Requirement: Feedback submission
On `POST /api/feedback` the server SHALL create a Feedback record linked to the calling user and the provided jobId, storing the rating and optional comments. The authenticated user SHALL only submit feedback for jobs they have viewed.

#### Scenario: valid feedback
- **GIVEN** an authenticated user and a valid jobId
- **WHEN** `POST /api/feedback` is called with `rating=4` and `comments="Good fit"`
- **THEN** the feedback SHALL be persisted and the response SHALL confirm success

---

### Requirement: Prisma schema & migration
The backend SHALL use Prisma as the ORM. `prisma/schema.prisma` SHALL define all domain models (User, Profile, Skill, UserSkill, Job, Matching, Resume, Feedback). On startup the server SHALL apply pending migrations automatically so the database schema matches the source of truth.

#### Scenario: clean startup
- **GIVEN** an empty PostgreSQL database and all migrations in `prisma/migrations/`
- **WHEN** the NestJS app starts
- **THEN** Prisma SHALL create any missing tables and the app SHALL boot without errors
