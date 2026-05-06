import { seedRetailers } from './retailers';
import { seedCanonicalProducts } from './products-bootstrap';
import { ensureCurrentAndNextMonthPartitions } from '../partitions';
import { queryClient } from '../db';

async function main() {
  await ensureCurrentAndNextMonthPartitions();
  await seedRetailers();
  await seedCanonicalProducts();
  await queryClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
