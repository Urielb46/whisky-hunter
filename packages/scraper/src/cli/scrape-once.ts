/**
 * CLI tool: run a single scrape job for a given retailer.
 * Usage: tsx --env-file=../../.env src/cli/scrape-once.ts <retailerId> [maxPages]
 *
 * Example: tsx src/cli/scrape-once.ts whisky-exchange 2
 */
import { getAdapter, listRegisteredAdapters } from '../adapters/registry.js';
import { getBrowser, closeBrowser } from '../browser.js';
import { resolveProduct } from '../resolver/product-resolver.js';
import { queryClient } from '@whisky-hunter/database';

const retailerId = process.argv[2];
const maxPages = parseInt(process.argv[3] ?? '1', 10);

if (!retailerId) {
  console.error('Usage: scrape-once <retailerId> [maxPages]');
  console.error('Registered adapters:', listRegisteredAdapters().join(', '));
  process.exit(1);
}

async function main() {
  console.log(`[scrape-once] retailer=${retailerId} maxPages=${maxPages}`);

  const adapter = getAdapter(retailerId!);
  const browser = await getBrowser();

  const products = await adapter.getAllProducts(
    browser,
    adapter['config'].baseUrl,
    maxPages,
  );

  console.log(`[scrape-once] scraped ${products.length} products`);

  let mapped = 0, pending = 0, skipped = 0;

  for (const raw of products) {
    const outcome = await resolveProduct(raw);
    if (outcome.status === 'mapped') mapped++;
    else if (outcome.status === 'pending_review') pending++;
    else skipped++;
  }

  console.log(`[scrape-once] mapped=${mapped} pending_review=${pending} skipped=${skipped}`);

  await closeBrowser();
  await queryClient.end();
}

main().catch((err) => {
  console.error('[scrape-once] fatal:', err);
  process.exit(1);
});
