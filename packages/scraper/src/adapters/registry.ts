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
import type { BaseAdapter } from './base-adapter.js';

// DATA-01: 10 registered adapters covering GB / US / EU / CA
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
  // CA
  'lcbo': () => new LcboAdapter(),
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
