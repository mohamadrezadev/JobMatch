# OpenSpec Rules for JobMatch

## Backend Stack Rules

### Language & Framework
- **Language:** TypeScript (strict mode)
- **Framework:** NestJS
- **API Contract:** OpenAPI 3.0
- **Architecture:** Modular monolith (modules may extract to services later)

### Module Layout
Each NestJS module follows:
```
src/modules/<module>/
├── domain/         # Entities, value objects, domain services
├── application/    # Use cases, services, DTOs
├── infrastructure/ # Repositories, external clients, adapters
├── presentation/   # Controllers, request/response mapping
└── index.ts        # Public exports
```

### Dependency Direction
```
domain ← application ← presentation
                ↑
          infrastructure
```

Rules:
1. Domain must not import application, infrastructure, or presentation
2. Application depends only on domain interfaces
3. Infrastructure implements application ports
4. Presentation calls application services only

### Database Rules
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Migrations:** Prisma migrate (versioned, explicit)
- Schema lives in `backend/prisma/schema.prisma`
- No raw SQL in application/domain layers

### Naming Conventions
- Modules: kebab-case (`user-profile`, `job-matcher`)
- Files: kebab-case (`user-service.ts`, `match-score.dto.ts`)
- Types: PascalCase (`UserProfileDto`, `JobMatchResult`)
- Change IDs: `JM-BACK-NNNN-name` (backend), `JM-FE-NNNN-name` (frontend)

### API Response Pattern
```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

### Error Handling
- Use NestJS built-in exception filters
- Map domain errors to HTTP status codes
- Never leak internal details to API responses

## Security Rules
- No hardcoded secrets
- Passwords hashed with bcrypt (rounds >= 12)
- JWT tokens: short-lived access + refresh token pattern
- All endpoints behind auth guard except public ones
- Input validation with class-validator

## Testing Rules
- Unit tests: co-located with source (`*.spec.ts`)
- Integration tests: `backend/test/integration/`
- E2E tests: `backend/test/e2e/`
- Frontend tests: `frontend/src/**/*.test.tsx`

## Code Review Checklist
- [ ] Domain purity (no infra/framework imports)
- [ ] No secrets in code
- [ ] API contract matches proposal.md
- [ ] Tests cover happy path + error paths
- [ ] TypeScript strict mode compliance
- [ ] No console.log in production code