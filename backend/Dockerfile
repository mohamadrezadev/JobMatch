# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config and root package.json
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./

# Copy backend package
COPY backend/package.json backend/tsconfig.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy backend source
COPY backend/src ./backend/src
COPY backend/assets ./backend/assets

# Build backend
RUN cd backend && pnpm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY turbo.json ./
COPY tsconfig.base.json ./
COPY backend/package.json backend/tsconfig.json ./backend/
COPY backend/prisma ./backend/prisma/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/assets ./backend/assets

EXPOSE 3000

CMD ["pnpm", "run", "start:backend"]
