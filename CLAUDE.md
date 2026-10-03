# JobMatch - AI Career Copilot

**Tagline:** AI Career Copilot for junior developers — find jobs, understand fit, identify skill gaps, generate resumes.

## Project Overview

JobMatch is a monorepo containing:
- **Backend**: NestJS + TypeScript API (Port 3000)
- **Frontend**: Next.js 15 + React 19 application (Port 3001)
- **Database**: PostgreSQL with Prisma ORM
- **AI Integration**: OpenAI API (GPT-4)
- **Monorepo Tooling**: Turborepo + pnpm workspaces

### Tech Stack Reference
| Layer | Technology |
|-------|-----------|
| Backend API | NestJS + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Frontend | Next.js 15 + React 19 + TypeScript |
| State Management | Zustand |
| Auth | JWT + bcrypt |
| AI Integration | OpenAI API (GPT-4) |
| PDF Generation | @react-pdf/renderer |

---

## Development Commands

### Monorepo Root
```bash
# Install all dependencies
pnpm install

# Start both dev servers (backend + frontend)
turbo dev

# Build all packages
turbo build

# Lint all packages
turbo lint

# Run tests across all packages
turbo test

# Run tests for specific package
turbo test --filter=backend
turbo test --filter=frontend
```

### Backend (NestJS)
```bash
cd backend

# Start development server
npm run start:dev

# Build for production
npm run build

# Run tests
npm test

# Run single test file
npx jest src/modules/auth/auth.service.spec.ts

# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name <migration-name>

# Reset database (destructive)
npx prisma migrate reset

# Seed database
npx prisma db seed
```

### Frontend (Next.js)
```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Run tests
npm test

# Run single test file
npx jest src/components/jobs/JobCard.test.tsx
```

---

## Architecture

### Directory Structure
```
jobmatch/
├── backend/                    # NestJS application
│   ├── src/
│   │   ├── modules/           # Feature modules (auth, users, skills, jobs, matching, resume, feedback)
│   │   │   └── <module>/      # Each module has controller, service, module, DTOs
│   │   ├── prisma/            # Database schema and migrations
│   │   │   ├── schema.prisma  # Main Prisma schema
│   │   │   └── migrations/    # Migration history
│   │   ├── common/            # Shared decorators, guards, interceptors, pipes
│   │   ├── app.module.ts     # Root module
│   │   └── main.ts           # Application entry point
│   ├── Dockerfile
│   └── jest.config.js
│
├── frontend/                   # Next.js 15 application
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   │   ├── (auth)/        # Public auth routes
│   │   │   ├── (dashboard)/   # Protected dashboard routes
│   │   │   └── layout.tsx     # Root layout
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # Base UI primitives
│   │   │   ├── layout/        # Navbar, Sidebar
│   │   │   ├── jobs/          # JobCard, JobFilters
│   │   │   ├── matching/      # MatchScore, SkillGapBadge
│   │   │   └── resume/        # ResumePreview
│   │   ├── lib/               # Utilities
│   │   │   ├── api-client.ts  # Axios instance with auth
│   │   │   └── utils.ts
│   │   ├── stores/            # Zustand stores
│   │   │   ├── useAuthStore.ts
│   │   │   └── useJobsStore.ts
│   │   └── types/             # TypeScript type definitions
│   ├── next.config.js
│   └── tailwind.config.ts
│
├── openspec/                  # OpenSpec configuration
│   ├── config.yaml
│   ├── specs/                 # Approved specifications
│   └── changes/               # Active change proposals
│
└── docs/
    └── architecture.md       # Full architecture documentation
```

### Module Structure (Backend)

Each NestJS module follows this pattern:
```typescript
// Example: auth module
src/modules/auth/
├── auth.controller.ts    # HTTP handlers
├── auth.service.ts       # Business logic
├── auth.module.ts        # Module definition
├── dto/                  # Data Transfer Objects
│   ├── register.dto.ts
│   └── login.dto.ts
└── auth.service.spec.ts  # Unit tests
```

### Route Groups (Frontend)

The frontend uses Next.js App Router route groups:
- `(auth)/` — Public routes: `/login`, `/register`
- `(dashboard)/` — Protected routes: `/profile`, `/jobs`, `/jobs/[id]`, `/resume`, `/settings`

---

## Database Models (Prisma)

### Core Entities
- **User** — Email, password (hashed), firstName, lastName, avatar
- **Profile** — userId, title, bio, location, desiredSalary, experienceLevel, workType, socialLinks
- **Skill** — name, description, category (Programming, Framework, Tool, Soft)
- **UserSkill** — userId, skillId, level (Beginner, Intermediate, Advanced), yearsOfExperience
- **Job** — title, company, location, workType, experienceLevel, salaryMin/Max, description, requiredSkills, preferredSkills, source, sourceUrl
- **Resume** — userId, jobId, content (JSON), version, pdfPath
- **JobFeedback** — userId, jobId, rating (Interested/Not Interested), reason, notes

### API Response Pattern
```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

---

## API Endpoints

### Auth Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login & get token |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/refresh | Refresh token |

### Users Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/profile | Get user profile |
| PUT | /api/users/profile | Update profile |
| GET | /api/users/skills | Get user skills |
| POST | /api/users/skills | Add skill |
| DELETE | /api/users/skills/:id | Remove skill |

### Jobs Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/jobs | List all jobs (paginated) |
| GET | /api/jobs/:id | Get job details |
| POST | /api/jobs/search | Search jobs |
| GET | /api/jobs/recommended | Get recommended jobs |

### Matching Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/matching/:jobId | Get match score for job |
| GET | /api/matching/explain/:jobId | Get match explanation |
| GET | /api/matching/gaps/:jobId | Get skill gaps |

### Resume Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/resume/generate | Generate resume for job |
| GET | /api/resume/:jobId | Get generated resume |
| GET | /api/resume/:jobId/pdf | Download PDF |

### Feedback Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/feedback | Submit job feedback |
| GET | /api/feedback/:jobId | Get feedback history |

---

## Matching Algorithm

The matching engine calculates a composite score (0-100) based on:

1. **Skill Match (60% weight)**
   - Required skills = 2 points each
   - Preferred skills = 1 point each
   - Formula: `(userHasSkills / totalRequired) * 0.6`

2. **Experience Match (20% weight)**
   - Junior (0-2 years): max score = 1
   - Mid (2-5 years): max score = 2
   - Senior (5+ years): max score = 3

3. **Location Match (10% weight)**
   - Remote jobs: full match for remote-preferring users
   - Same city: full points
   - Different city: partial points

4. **Salary Match (10% weight)**
   - Job salary meets minimum expectation: full points
   - Otherwise: partial points

**Output Format:**
```json
{
  "matchScore": 82,
  "breakdown": {
    "skills": { "score": 85, "matched": [...], "missing": [...] },
    "experience": { "score": 70, "details": "..." },
    "location": { "score": 100, "details": "Remote" },
    "salary": { "score": 60, "details": "Below expectation" }
  },
  "explanation": "You have 85% of required skills...",
  "skillGaps": ["Docker", "Redis"]
}
```

---

## Design Principles

Three core principles guide all implementation:

1. **Explainability** — Every score must be explainable. Users need to understand WHY a job is a good/bad fit.

2. **Honesty** — Never fabricate user experience or skills. Only use verified data from the User and Profile entities.

3. **Actionability** — Every insight leads to an action. Skill gaps should suggest learning paths, match scores should prompt applications or improvements.

---

## OpenSpec Workflow

This project uses OpenSpec for spec-driven development. Changes are tracked through artifacts:

1. **Proposal** — Problem statement, scope, capabilities, impact
2. **Design** — Context, goals, decisions, risks
3. **Specs** — Requirements with WHEN/THEN scenarios
4. **Tasks** — Implementation checklist

### OpenSpec Commands
```bash
# Start a new change
openspec new change <name> --description "<description>"

# View change status
openspec status --change <change-name>

# Validate change artifacts
openspec validate <change-name>

# Sync specs to main
openspec sync-specs

# Create all artifacts at once (fast-forward)
opsx:ff
```

### Current Change IDs (MVP Phase)
| ID | Feature | Priority |
|----|---------|----------|
| JM-BACK-0001 | Auth scaffold | P0 |
| JM-FE-0001 | Auth pages | P0 |
| JM-BACK-0002 | User profile | P0 |
| JM-FE-0002 | Profile form | P0 |
| JM-BACK-0003 | Skills management | P0 |
| JM-FE-0003 | Skills UI | P0 |
| JM-BACK-0004 | Job listing API | P0 |
| JM-FE-0004 | Job list page | P0 |
| JM-BACK-0005 | Job detail API | P0 |
| JM-FE-0005 | Job detail page | P0 |
| JM-BACK-0006 | Matching engine | P0 |
| JM-FE-0006 | Match display | P0 |

---

## Environment Variables

### Backend (.env.example)
```
DATABASE_URL="postgresql://user:password@localhost:5432/jobmatch"
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_SECRET="your-refresh-secret"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
```

### Frontend (.env.example)
```
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

---

## Testing Strategy

### Backend
- **Unit tests**: Co-located with source (`*.spec.ts`)
- **Integration tests**: `backend/test/integration/`
- **E2E tests**: `backend/test/e2e/`

### Frontend
- **Unit tests**: Jest + React Testing Library
- **File location**: `frontend/src/**/*.test.tsx`

Run all tests:
```bash
turbo test
```

Run specific test suite:
```bash
cd backend && npx jest src/modules/auth
cd frontend && npx jest src/stores
```

---

## Deployment Notes

### Backend Docker
Multi-stage build included. Exposes port 3000. Requires PostgreSQL container.

### Production Build
```bash
# Build both workspaces
turbo build

# Start production
turbo start
```

## Active OpenSpec Changes

| Change ID | Description | Status |
|-----------|-------------|--------|
| `project-initialization` | Scaffold monorepo (backend + frontend + infra) | ✅ Ready |
| `landing-page-and-onboarding` | Public landing page + onboarding wizard + profile gate | ✅ Ready |
| `resume-integrity-and-personalization` | Resume integrity guard + feedback-driven recommendations | ✅ Ready |

### Critical Rules from PRD
- **Resume Integrity**: Never fabricate user data in AI-generated resumes. Cross-check all claims against verified `UserSkill`, `Profile`, and employment history.
- **Feedback Loop**: `JobFeedback` drives recommendation ranking after ≥3 entries with ±15% cap.
- **Onboarding Gate**: Dashboard routes are inaccessible until onboarding (4 steps) is complete.

---

## Key Implementation Patterns

### Authentication Flow
1. User registers → bcrypt hash password (12 rounds) → store in DB
2. Login → verify credentials → sign JWT access token (1h) + refresh token (7d)
3. Protected routes → JwtAuthGuard validates token → extracts user via `@CurrentUser()` decorator
4. Token refresh → validate refresh token → issue new token pair

### API Client Pattern (Frontend)
```typescript
// lib/api-client.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Zustand Store Pattern
```typescript
// stores/useAuthStore.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({ /* state and actions */ }),
    { name: 'auth-storage' }
  )
);
```

---

## Files of Interest

- `docs/architecture.md` — Full architecture documentation
- `openspec/prds/PRD-001-mvp.md` — Master PRD with constraints (no fabrication, feedback loop)
- `openspec/prds/ARCH-001-architecture.md` — Architecture spec
- `openspec/config.yaml` — OpenSpec configuration
- `openspec/rules/backend-rules.md` — Backend coding standards
- `openspec/rules/frontend-rules.md` — Frontend coding standards
- `backend/src/prisma/schema.prisma` — Database schema
- `frontend/src/lib/api-client.ts` — API client configuration
- `frontend/src/stores/useAuthStore.ts` — Authentication state management
