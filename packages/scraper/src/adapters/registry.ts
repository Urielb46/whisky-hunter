import { WhiskyExchangeAdapter } from './whisky-exchange.js';
import { MasterOfMaltAdapter } from './master-of-malt.js';
import { TotalWineAdapter } from './total-wine.js';
import { WhiskyDeAdapter } from './whisky-de.js';
import { WhiskyBarrelAdapter } from './whisky-barrel.js';
import { AbbeyWhiskyAdapter } from './abbey-whisky.js';
import { SpecsAdapter } from './specs.js';
import { KlWinesAdapter } from './kl-wines.js';
import { LaMaisonDuWhiskyAdapter } from './la-maison-du-whisky.js';
import { LcboAdapter } from './lcbo.js';
import { WhiskybaseShopAdapter } from './whiskybase-shop.js';
import type { BaseAdapter } from './base-adapter.js';

// Whiskybase catalog adapter is NOT a price-scraper adapter and is NOT
// registered here. Use WhiskybaseCatalogAdapter directly from the CLI.
// Re-exported here for convenience only.
export { WhiskybaseCatalogAdapter, whiskybaseCatalogAdapter } from './whiskybase-catalog.js';
export type { WhiskybaseProduct } from './whiskybase-catalog.js';

// DATA-01: 11 registered adapters covering GB / US / EU / CA / NL
const REGISTRY: Record<string, () => BaseAdapter> = {
  // UK
  'whisky-exchange': () => new WhiskyExchangeAdapter(),
  'master-of-malt':  () => new MasterOfMaltAdapter(),
  'whisky-barrel':   () => new WhiskyBarrelAdapter(),
  'abbey-whisky':    () => new AbbeyWhiskyAdapter(),
  // US
  'total-wine': () => new TotalWineAdapter(),
  'specs':      () => new SpecsAdapter(),
  'kl-wines':   () => new KlWinesAdapter(),
  // EU
  'whisky-de':           () => new WhiskyDeAdapter(),
  'la-maison-du-whisky': () => new LaMaisonDuWhiskyAdapter(),
  // NL — whiskybase_id keyed (DATA-02)
  'whiskybase-shop': () => new WhiskybaseShopAdapter(),
  // CA
  'lcbo': () => new LcboAdapter(),
};

export function getAdapter(retailerId: string): BaseAdapter {
  const factory = REGISTRY[retailerId];
  if (!factory) {
    throw new Error(
      'No scraper adapter registered for retailer: "' + retailerId + '". ' +
      'Registered: ' + Object.keys(REGISTRY).join(', '),
    );
  }
  return factory();
}

export function listRegisteredAdapters(): string[] {
  return Object.keys(REGISTRY);
}
