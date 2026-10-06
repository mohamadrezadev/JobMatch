# Build from the repository root: docker build -f backend/Dockerfile .
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@10.12.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm --filter jobmatch-backend... install --frozen-lockfile --ignore-scripts
COPY backend/src ./backend/src
COPY backend/assets ./backend/assets
COPY backend/tsconfig.json ./backend/tsconfig.json
WORKDIR /app/backend
# Workspace policy disables install scripts. Build Linux-native bcrypt explicitly.
RUN node -e "const {spawnSync}=require('node:child_process'); const {dirname}=require('node:path'); const r=spawnSync('npm',['run','install','--','--build-from-source'],{cwd:dirname(require.resolve('bcrypt/package.json')),stdio:'inherit'}); process.exit(r.status ?? 1)"
RUN pnpm exec prisma generate && pnpm run build

FROM node:22-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
ENV NODE_ENV=production PORT=3000 RESUME_PDF_DIR=/app/backend/storage/resumes
# Keep the pnpm store alongside workspace links and the Prisma migration CLI.
COPY --from=builder --chown=node:node /app/node_modules /app/node_modules
COPY --from=builder --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/backend/package.json ./package.json
COPY --from=builder --chown=node:node /app/backend/dist ./dist
COPY --from=builder --chown=node:node /app/backend/assets ./assets
COPY --from=builder --chown=node:node /app/backend/src/prisma ./src/prisma
RUN mkdir -p storage/resumes && chown -R node:node storage
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
