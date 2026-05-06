# @whisky-hunter/database

PostgreSQL 16 + Drizzle ORM 0.45.2.

## Migration Workflow (Locked)

```
pnpm --filter @whisky-hunter/database run db:generate
# (manual: edit src/migrations/000N_*.sql to add any partition/materialized view DDL)
pnpm --filter @whisky-hunter/database run db:migrate
```

## DO NOT RUN

- `drizzle-kit push`        — drops unrecognized columns silently. Production-unsafe.
- `drizzle-kit introspect`  — sees partitioned `price_snapshots` as multiple top-level tables and overwrites schema. See RESEARCH.md Pitfall 1.

## price_snapshots is APPEND-ONLY

- TypeScript: no `db.update(priceSnapshots)` or `db.delete(priceSnapshots)` in any code path.
- SQL: `REVOKE UPDATE, DELETE ON TABLE price_snapshots FROM <app_role>` is executed by `0000_initial.sql`.
- Schema changes to this table go in NEW migration files; never re-generate.

## Monthly partitions

- Created at runtime by `ensureCurrentAndNextMonthPartitions()` (src/partitions.ts).
- A BullMQ job (in @whisky-hunter/scraper) runs this on the 25th of every month.

## Setup

```bash
cp .env.example .env
# Fill in DATABASE_URL (Neon free tier: console.neon.tech)
# Fill in REDIS_URL (Railway Redis or: docker run -p 6379:6379 redis:7)

pnpm install
pnpm --filter @whisky-hunter/database run db:migrate
pnpm --filter @whisky-hunter/database run db:seed
```
