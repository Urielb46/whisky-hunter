# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.33.2 --quiet

# Copy workspace manifests only — changes to source won't bust this layer
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json        ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json   ./packages/shared/
COPY packages/search/package.json   ./packages/search/

# Use --no-frozen-lockfile so new deps (e.g. ioredis) are installed even if
# lockfile hasn't been regenerated locally yet.
RUN pnpm install --no-frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

RUN npm install -g pnpm@10.33.2 --quiet

# Restore installed node_modules from deps stage
COPY --from=deps /app/node_modules          ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/shared/node_modules   ./packages/shared/node_modules
COPY --from=deps /app/packages/search/node_modules   ./packages/search/node_modules

# Copy workspace manifests (needed by pnpm filter)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/         ./apps/api/
COPY packages/database/ ./packages/database/
COPY packages/shared/   ./packages/shared/
COPY packages/search/   ./packages/search/

# Copy root tsconfig that app configs extend
COPY tsconfig.base.json ./

RUN pnpm --filter @whisky-hunter/api build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only the built output and production node_modules
COPY --from=build /app/apps/api/dist            ./apps/api/dist
COPY --from=build /app/apps/api/node_modules    ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json    ./apps/api/package.json

COPY --from=build /app/packages/database/dist   ./packages/database/dist
COPY --from=build /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=build /app/packages/database/package.json ./packages/database/package.json

COPY --from=build /app/packages/shared/dist     ./packages/shared/dist
COPY --from=build /app/packages/shared/node_modules   ./packages/shared/node_modules
COPY --from=build /app/packages/shared/package.json   ./packages/shared/package.json

COPY --from=build /app/packages/search/dist     ./packages/search/dist
COPY --from=build /app/packages/search/node_hmodules   ./packages/search/node_modules
COPY --from=build /app/packages/search/package.json   ./packages/search/package.json

COPY --from=build /app/node_modules             ./node_modules
COPY --from=build /app/package.json             ./package.json

EXPOSE 3000

WORKDIR /app/apps/api

CMD ["node", "dist/index.js"]
