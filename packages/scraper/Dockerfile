# Railway Playwright worker
# Uses Microsoft's official Playwright base image which pre-installs Chromium,
# Firefox, WebKit, and all required system dependencies (fonts, libs, sandbox).
# Source: https://mcr.microsoft.com/en-us/artifact/mar/playwright
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# Install pnpm before copying source (layer cache: pnpm install is slow)
RUN npm install -g pnpm@10.33.2 --quiet

# Copy workspace manifests first — changes to source won't bust the dep-install layer
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json  ./packages/database/
COPY packages/scraper/package.json   ./packages/scraper/
COPY packages/shared/package.json    ./packages/shared/

# Install production deps only (devDeps not needed in the worker image)
RUN pnpm install --frozen-lockfile --prod

# Copy source after deps for maximum layer-cache reuse
COPY packages/ ./packages/

# Playwright browsers are already installed in the base image — no install needed.
# If you change FROM to a non-playwright base, uncomment the line below:
# RUN pnpm --filter @whisky-hunter/scraper exec playwright install chromium --with-deps

# Environment
ENV NODE_ENV=production

# Railway passes PORT, DATABASE_URL, REDIS_URL, PROXY_URL via env vars.
# Do NOT bake secrets into this image.

# Run the BullMQ worker (persistent process — not serverless)
CMD ["pnpm", "--filter", "@whisky-hunter/scraper", "exec", "tsx", "src/worker-entry.ts"]
