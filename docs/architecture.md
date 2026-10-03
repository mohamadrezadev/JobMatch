# JobMatch Architecture

## Overview
AI Career Copilot for junior developers. Find jobs, understand fit, identify skill gaps, generate resumes.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend API | NestJS + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Frontend | Next.js 15 + React 19 + TypeScript |
| State Management | Zustand |
| Auth | JWT + bcrypt |
| AI Integration | OpenAI API (GPT-4) |
| PDF Generation | @react-pdf/renderer |

## Monorepo Structure
```
JobMatch/
├── package.json          # Root workspace
├── turbo.json            # Turborepo config
├── pnpm-workspace.yaml   # pnpm workspaces
│
├── backend/              # NestJS application
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── skills/
│   │   │   ├── jobs/
│   │   │   ├── matching/
│   │   │   ├── resume/
│   │   │   └── feedback/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   └── pipes/
│   │   └── main.ts
│   ├── Dockerfile
│   └── jest.config.js
│
├── frontend/             # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/page.tsx
│   │   │   ├── (dashboard)/layout.tsx
│   │   │   ├── (dashboard)/profile/page.tsx
│   │   │   ├── (dashboard)/jobs/page.tsx
│   │   │   ├── (dashboard)/jobs/[id]/page.tsx
│   │   │   └── (dashboard)/resume/page.tsx
│   │   ├── components/
│   │   ├── lib/api-client.ts
│   │   ├── stores/
│   │   └── types/
│   └── next.config.js
│
└── openspec/             # OpenSpec configuration
    ├── config.yaml
    ├── specs/            # Approved specs
    └── changes/          # Active change folders
```

## API Design

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

## Data Models

### User
- id: UUID
- email: string (unique)
- password: string (hashed)
- firstName: string
- lastName: string
- avatar: string (URL)
- createdAt: datetime
- updatedAt: datetime

### Profile
- userId: UUID (FK)
- title: string (e.g., "Junior Backend Developer")
- bio: text
- location: string
- desiredSalary: number
- experienceLevel: enum (Junior, Mid, Senior)
- workType: enum (Remote, On-site, Hybrid)
- socialLinks: JSON
- createdAt: datetime
- updatedAt: datetime

### Skill
- id: UUID
- name: string (e.g., "C#")
- description: string
- category: enum (Programming, Framework, Tool, Soft)
- createdAt: datetime

### UserSkill
- userId: UUID (FK)
- skillId: UUID (FK)
- level: enum (Beginner, Intermediate, Advanced)
- yearsOfExperience: number
- createdAt: datetime

### Job
- id: UUID
- title: string
- company: string
- location: string
- workType: enum (Remote, On-site, Hybrid)
- experienceLevel: string
- salaryMin: number
- salaryMax: number
- description: text
- requiredSkills: JSON (array of skill objects)
- preferredSkills: JSON
- postedAt: datetime
- source: string (e.g., "LinkedIn", "Indeed")
- sourceUrl: string
- createdAt: datetime
- updatedAt: datetime

### Resume
- id: UUID
- userId: UUID (FK)
- jobId: UUID (FK)
- content: JSON
- version: number
- pdfPath: string
- createdAt: datetime
- updatedAt: datetime

### JobFeedback
- id: UUID
- userId: UUID (FK)
- jobId: UUID (FK)
- rating: enum (Interested, Not Interested)
- reason: string (nullable)
- notes: text
- createdAt: datetime

## Matching Algorithm

### Core Logic
1. **Skill Match (60% weight)**
   - Each required skill = 2 points
   - Each preferred skill = 1 point
   - Max possible = sum of all skill weights
   - Match = (userHasSkills / totalRequired) * 0.6

2. **Experience Match (20% weight)**
   - Compare years of experience vs required
   - Junior (0-2 years): max score = 1
   - Mid (2-5 years): max score = 2
   - Senior (5+ years): max score = 3

3. **Location Match (10% weight)**
   - Remote jobs: always match for remote-preferring users
   - Same city: full points
   - Different city: partial points

4. **Salary Match (10% weight)**
   - If job salary range meets minimum expectations: full points
   - Otherwise: partial points

### Output Format
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

## Design Principles
1. **Explainability**: Every score must be explainable
2. **Honesty**: Never fabricate user experience or skills
3. **Actionability**: Every insight leads to an action

## MVP Scope
Must Have:
- User Profile & Skills management
- Job list with search/filter
- Job detail with match score & explanation
- Skill gap analysis
- Job feedback (Interested / Not Interested)
- AI Resume generation
- Resume PDF download

Nice to Have:
- Job preferences learning
- Recommendation ranking
- Resume templates
- Simple dashboard

## OpenSpec Change IDs (Phase 0 - MVP)
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
| JM-BACK-0007 | Resume generation | P1 |
| JM-FE-0007 | Resume preview | P1 |
| JM-BACK-0008 | PDF export | P1 |
| JM-FE-0008 | Dashboard | P1 |