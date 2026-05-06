import { db } from '../db';
import { products } from '../schema/products';
import { sql } from 'drizzle-orm';
import data from './data/canonical-products.json' with { type: 'json' };

export async function seedCanonicalProducts(): Promise<number> {
  // Skip if products already exist — bootstrap is one-time.
  const result = await db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM products`,
  );
  const count = parseInt(result[0]?.count ?? '0', 10);
  if (count > 0) {
    console.log(`canonical products: ${count} already exist, skipping bootstrap seed`);
    return 0;
  }
  const inserted = await db
    .insert(products)
    .values(data as unknown as Array<typeof products.$inferInsert>)
    .returning({ id: products.id });
  console.log(`canonical products: inserted ${inserted.length}`);
  return inserted.length;
}
