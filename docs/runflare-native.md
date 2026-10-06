# Runflare native service deployment

The selected project is `jobmatchapp` (35030): backend 82177, frontend `frontapp` 82178 and PostgreSQL `jobmatchappdb` 82179. Backend uses the Node.js preset; frontend uses the Next.js preset. These presets build their own images and do not use the repository Dockerfiles.

The official Windows CLI is installed locally at `artifacts/runflare.exe` (version 1.3.1). It is not committed. Authenticate with `login` in a local terminal; never add account credentials or environment values to source files.

## Configuration

Keep command, arguments and lifecycle hooks empty in the portal. The presets use the uploaded package's `start` script. Both applications listen on port 3000; the existing service routes HTTP port 80 to container port 3000.

Backend environment: `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0`, the database's internal `DATABASE_URL`, separate random `JWT_SECRET` and `REFRESH_TOKEN_SECRET`, and `CORS_ORIGIN` equal to the frontend origin. Configure the application's model and discovery provider variables in the portal. `RESUME_PDF_DIR=/app/storage/resumes` needs a persistent disk mounted at that path to retain generated PDFs across container replacements.

Frontend environment: `PORT=3000`, `HOST=0.0.0.0`, `NEXT_PUBLIC_API_URL` equal to the public backend origin, `NEXT_TELEMETRY_DISABLED=1`, and `NPM_CONFIG_PRODUCTION=false` so build dependencies are installed. Changing `NEXT_PUBLIC_API_URL` requires a new frontend build.

Current temporary public origins:

- Frontend: https://frontapp-vtx-jobmatchapp.runflare.cloud
- Backend: https://backend-61j-jobmatchapp.runflare.cloud

## Deploy

Compile the backend before packaging; the native backend package contains compiled JavaScript, assets, Prisma schema and migrations. It generates the Prisma client during dependency installation and runs `prisma migrate deploy` before starting Nest. Runflare's dependency layer flattens the `prisma` directory into `/app`; the preparation script selects the schema path that exists in that layer. The full source layer restores the normal `prisma/` directory for runtime migrations.

```powershell
Push-Location backend
try { pnpm exec nest build; if ($LASTEXITCODE -ne 0) { throw 'Backend build failed' } } finally { Pop-Location }
$backendPayload = .\scripts\prepare-runflare-native.ps1 -Service backend
$frontendPayload = .\scripts\prepare-runflare-native.ps1 -Service frontend
$runflareCli = Join-Path (Get-Location) 'artifacts/runflare.exe'

Push-Location $backendPayload
try {
    & $runflareCli deploy --project-id 35030 --item-id 82177
    if ($LASTEXITCODE -ne 0) { throw 'Backend deployment failed' }
    & $runflareCli restart --project-id 35030 --item-id 82177 -y
} finally { Pop-Location }

Push-Location $frontendPayload
try {
    & $runflareCli deploy --project-id 35030 --item-id 82178
    if ($LASTEXITCODE -ne 0) { throw 'Frontend deployment failed' }
    & $runflareCli restart --project-id 35030 --item-id 82178 -y
} finally { Pop-Location }
```

The preparation script creates a unique flat directory under ignored `artifacts/runflare/`, omits environment files, and pins dependency versions to locally installed versions. The frontend package includes tracked frontend files and a relocated base TypeScript configuration. Rebuild the backend after source changes; regenerate payloads after modifying tracked files.

In CLI 1.3.1, `deploy --output json` returns target selection without uploading a build. Omit that option for actual deployment. `status` and `log` must be run from a payload directory already used for deployment. Use singular `log` and `event`, as shown by the installed CLI's help.

After a successful build, restart the service to activate the image. Verify the backend's `/api/docs-json` contains an OpenAPI document and that the frontend renders KarMatch. An HTTP 200 alone can be the platform's default placeholder page. Inspect runtime logs for migration and application startup failures.

These native payloads deploy through the CLI. A Git connection pointing at the unmodified monorepo root does not produce the same package. Use the documented packaging commands for subsequent native deployments, or configure Docker services as described in [runflare.md](runflare.md).
