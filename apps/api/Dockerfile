# Single-stage: run API via tsx (no compiled dist needed)
# Consistent with how the scraper worker runs.
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.33.2 --quiet

# Copy workspace manifests first — dep-install layer cached separately from source
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json          ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json   ./packages/shared/
COPY packages/search/package.json   ./packages/search/

# Install all production deps (--no-frozen-lockfile tolerates lockfile drift)
RUN pnpm install --no-frozen-lockfile --prod

# Copy source after deps for maximum layer-cache reuse
COPY apps/api/         ./apps/api/
COPY packages/database/ ./packages/database/
COPY packages/shared/   ./packages/shared/
COPY packages/search/   ./packages/search/
COPY tsconfig.base.json ./

ENV NODE_ENV=production

EXPOSE 3000

WORKDIR /app/apps/api

# tsx handles TypeScript imports directly - no build step needed
CMD ["pnpm", "start"]
