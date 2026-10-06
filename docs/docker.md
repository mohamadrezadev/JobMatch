# Docker

Build each service separately from the repository root. Both Dockerfiles use the committed pnpm lockfile and run as the non-root `node` user. Local environment files, dependency folders and generated outputs are excluded from the build context.

```sh
docker build -f backend/Dockerfile -t jobmatch-backend .
docker build -f frontend/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:3000 -t jobmatch-frontend .
```

`NEXT_PUBLIC_API_URL` is embedded at build time and must be reachable by the user's browser. For deployment, replace it with the public HTTPS API address and rebuild the frontend. The frontend image includes Next's standalone server, static assets and the generated PWA worker.

The backend needs a reachable PostgreSQL database. Its environment file must supply `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET` and the model configuration used by the application. Set `CORS_ORIGIN` to the frontend's browser-visible origin. A database on the Docker Desktop host is reachable using `host.docker.internal` rather than `localhost`.

Apply migrations explicitly before starting the new backend version:

```sh
docker run --rm --env-file backend/.env jobmatch-backend node node_modules/prisma/build/index.js migrate deploy --schema src/prisma/schema.prisma
docker run -d --name jobmatch-backend --env-file backend/.env -e PORT=3000 -e CORS_ORIGIN=http://localhost:3001 -p 3000:3000 -v jobmatch-resumes:/app/backend/storage/resumes jobmatch-backend
docker run -d --name jobmatch-frontend -p 3001:3001 jobmatch-frontend
```

The backend includes OpenSSL, generated Prisma Client, Linux-native bcrypt and the bundled Persian PDF font. Its pnpm dependency store remains alongside workspace links; build dependencies are retained so the migration CLI is available. Resume PDFs use the mounted volume. Database migrations are not run automatically at application startup.

## Validation

Both images were built successfully with Docker Desktop's Linux engine on 2026-10-06. `docker build --check` passed for both Dockerfiles without warnings. Runtime checks passed using an isolated disposable PostgreSQL database: all migrations, backend startup, registration with bcrypt, PDF rendering, frontend HTTP, the generated PWA worker and offline page, and non-root execution in both services. Test containers and their database were removed afterward.
