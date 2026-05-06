import { WhiskyExchangeAdapter } from './whisky-exchange.js';
import { MasterOfMaltAdapter } from './master-of-malt.js';
import { TotalWineAdapter } from './total-wine.js';
import { WhiskyDeAdapter } from './whisky-de.js';
import type { BaseAdapter } from './base-adapter.js';

const REGISTRY: Record<string, () => BaseAdapter> = {
  'whisky-exchange': () => new WhiskyExchangeAdapter(),
  'master-of-malt': () => new MasterOfMaltAdapter(),
  'total-wine': () => new TotalWineAdapter(),
  'whisky-de': () => new WhiskyDeAdapter(),
};

export function getAdapter(retailerId: string): BaseAdapter {
  const factory = REGISTRY[retailerId];
  if (!factory) {
    throw new Error(
      `No scraper adapter registered for retailer: "${retailerId}". ` +
        `Registered: ${Object.keys(REGISTRY).join(', ')}`,
    );
  }
  return factory();
}

export function listRegisteredAdapters(): string[] {
  return Object.keys(REGISTRY);
}
