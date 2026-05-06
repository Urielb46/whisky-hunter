import { sql } from 'drizzle-orm';
import { db } from './db';

/**
 * Idempotently create the partition for a given (year, month).
 * Mitigates Pitfall 4: scraper writes on the 1st of a new month fail without a partition.
 */
export async function ensurePartitionForMonth(year: number, month: number): Promise<void> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  const partitionName = `price_snapshots_${year}_${String(month).padStart(2, '0')}`;
  await db.execute(sql.raw(
    `CREATE TABLE IF NOT EXISTS "${partitionName}" ` +
    `PARTITION OF "price_snapshots" ` +
    `FOR VALUES FROM ('${start}') TO ('${end}');`
  ));
}

export async function ensureCurrentAndNextMonthPartitions(now: Date = new Date()): Promise<void> {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  await ensurePartitionForMonth(y, m);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  await ensurePartitionForMonth(ny, nm);
}
