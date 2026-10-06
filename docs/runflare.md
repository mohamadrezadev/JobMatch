# Runflare CLI deployment

The selected `jobmatchapp` services use Node.js and Next.js presets. Follow [runflare-native.md](runflare-native.md) for their actual deployment. The Docker packaging below applies only to service items configured with a Docker preset.

The official Windows CLI was downloaded to `artifacts/runflare.exe` from the binary URL used by Runflare's installer. `version` reports 1.3.1. It is local tooling, not committed. The inspected CLI supports `deploy`, `status`, `log`, `event`, `start` and `restart`; deployment accepts `--project-id` and `--item-id`. It has no Dockerfile-path or build-argument flags.

Log in interactively from the repository root. Enter passwords and two-factor codes only in the local terminal:

```powershell
.\artifacts\runflare.exe login
```

Create the two Docker service items and PostgreSQL database in the portal. Configure their runtime environment, networking and persistent PDF disk as described in `docs/docker.md`. The CLI deploys to existing service items; login and target selection must be resolved before deploying.

Prepare isolated deployment roots with a root-level Dockerfile. The preparation script copies tracked files from the current working tree, omits environment files and generated outputs, and preserves workspace manifests and the lockfile. For the frontend it embeds the browser-visible API URL in the Dockerfile's build argument default.

```powershell
$backendPayload = .\scripts\prepare-runflare.ps1 -Service backend
$frontendPayload = .\scripts\prepare-runflare.ps1 -Service frontend -ApiUrl https://YOUR-PUBLIC-BACKEND
```

Deploy each payload to its corresponding service, using numeric IDs from the account. Replace these placeholders with real IDs; the CLI executable path is absolute because the working directory changes:

```powershell
$runflareCli = Join-Path (Get-Location) 'artifacts/runflare.exe'
Push-Location $backendPayload
try { & $runflareCli deploy --project-id PROJECT_ID --item-id BACKEND_ITEM_ID } finally { Pop-Location }
Push-Location $frontendPayload
try { & $runflareCli deploy --project-id PROJECT_ID --item-id FRONTEND_ITEM_ID } finally { Pop-Location }
```

Use `log --project-id PROJECT_ID --item-id ITEM_ID --follow` for runtime logs. Deployments and application startup are distinct: inspect service state and build/runtime logs after upload. Database migrations and the public frontend API URL still need the configuration described in `docs/docker.md`.

In inspected CLI 1.3.1, `deploy --output json` only returns target selection; omit it to upload and build. Run `restart --project-id PROJECT_ID --item-id ITEM_ID -y` after a successful build to activate the deployed image. Run `status` and `log` from a payload directory that has already been deployed.

Sources: [current Docker CLI guide](https://docs.runflare.com/docker/deploy-cli/), [official installer](https://get.runflare.com/install.bat), and the installed executable's `--help`. The older website's plural `logs` and `events` spellings differ from the inspected executable's singular `log` and `event` commands.
