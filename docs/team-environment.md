# Team environment setup

The committed examples contain the shared router address and model names, with
empty API keys. Local environment files stay ignored by Git.

From the repository root, in PowerShell:

```powershell
pnpm install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
docker compose up -d postgres
```

Copy the examples only on first setup; do not overwrite existing local settings.
The database example matches `docker-compose.yml` (port 5432). If your database
uses a different port or credentials, update `DATABASE_URL` in `backend/.env`.

Obtain an authorized router API key privately from the team and set
`NINEROUTER_API_KEY` and `OPENAI_API_KEY` in `backend/.env`. They may use the same
key when the router grants both endpoints. Generate two separate local secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run this command twice and use the outputs for `JWT_SECRET` and
`REFRESH_TOKEN_SECRET`, respectively. Do not commit the outputs or real keys.

The shared router uses `search-combo` for web searches, `tinyfish` for page
fetching, and `agents` for LLM requests. The fetch policy flag applies to the
verified shared TinyFish setup; re-verify it if you change the router/provider.

Prepare the database and start both applications in separate terminals:

```powershell
cd backend
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

```powershell
cd frontend
pnpm dev
```

Backend: `http://localhost:3100`; frontend: `http://localhost:3001`.
The frontend API URL and backend CORS origin in the examples match these ports.
Restart the affected process after changing its environment file. Live chat runs
require a signed-in account and the applied database migrations.
