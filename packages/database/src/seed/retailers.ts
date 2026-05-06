import { db } from '../db';
import { retailers } from '../schema/retailers';
import data from './data/retailers.json' with { type: 'json' };

export async function seedRetailers(): Promise<number> {
  let inserted = 0;
  for (const r of data) {
    const result = await db
      .insert(retailers)
      .values(r as typeof retailers.$inferInsert)
      .onConflictDoNothing({ target: retailers.id })
      .returning({ id: retailers.id });
    inserted += result.length;
  }
  console.log(`retailers: inserted ${inserted}, total in file: ${data.length}`);
  return inserted;
}
