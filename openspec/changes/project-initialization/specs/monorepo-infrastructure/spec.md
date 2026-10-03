## ADDED Requirements

### Requirement: Root package.json workspace scripts
The project root `package.json` SHALL declare `pnpm-workspace.yaml` and expose shared scripts (`dev`, `build`, `lint`, `test`) that delegate to Turborepo. Running `pnpm install` at the root SHALL resolve dependencies across both `backend` and `frontend` workspaces.

#### Scenario: clean install
- **GIVEN** an empty `node_modules` directory at the project root
- **WHEN** `pnpm install` is executed
- **THEN** `node_modules` SHALL be created in the root and in each workspace; no dependency resolution SHALL fail

---

### Requirement: Turborepo pipeline configuration
`turbo.json` SHALL define task pipelines for `dev`, `build`, `lint`, and `test` scoped to each workspace. Running `turbo dev` SHALL start both the NestJS and Next.js development servers concurrently. Independent tasks SHALL run in parallel where possible.

#### Scenario: turbo dev runs both servers
- **GIVEN** both workspaces declare a `dev` script in their respective `package.json`
- **WHEN** `turbo dev` is invoked from the project root
- **THEN** the NestJS backend and Next.js frontend SHALL start concurrently and be reachable on their respective ports

---

### Requirement: Shared TypeScript configuration
Both `backend/tsconfig.json` and `frontend/tsconfig.json` SHALL extend the root `tsconfig.base.json`. The shared config SHALL enforce `strict: true`, `esModuleInterop: true`, and a consistent `target` setting.

#### Scenario: type-check succeeds
- **GIVEN** TypeScript source files exist in both workspaces
- **WHEN** `tsc --noEmit` is run from each workspace root
- **THEN** compilation SHALL succeed with zero type errors in strict mode

---

### Requirement: Dockerfile for backend
A `backend/Dockerfile` SHALL exist with a multi-stage build: first stage compiles NestJS, second stage runs the compiled output. The final image SHALL expose port 3000 and read `DATABASE_URL` from environment variables.

#### Scenario: container starts successfully
- **GIVEN** a built Docker image and a running PostgreSQL container
- **WHEN** `docker run -p 3000:3000 -e DATABASE_URL=postgres://... <image>` is executed
- **THEN** the NestJS health endpoint SHALL respond with HTTP 200 within 10 seconds of startup

---

### Requirement: Environment variable templates
Both `backend/.env.example` and `frontend/.env.example` SHALL document every required variable with placeholder values and descriptive comments. Variables SHALL include `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `NEXT_PUBLIC_API_URL`.

#### Scenario: env template completeness
- **GIVEN** the backend `.env.example` file
- **WHEN** a developer reads it
- **THEN** it SHALL list `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_SECRET`, `OPENAI_API_KEY`, and `OPENAI_MODEL` with comments
