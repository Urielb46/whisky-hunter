import { describe, it, expect } from 'vitest';
import { getAdapter, listRegisteredAdapters } from '../registry.js';

describe('adapter registry', () => {
  it('lists all adapters', () => {
    const ids = listRegisteredAdapters();
    expect(ids).toContain('whisky-exchange');
    expect(ids).toContain('master-of-malt');
    expect(ids).toContain('total-wine');
    expect(ids).toContain('whisky-de');
  });

  it.each(['whisky-exchange', 'master-of-malt', 'total-wine', 'whisky-de'])(
    'returns adapter for %s',
    (id) => {
      const adapter = getAdapter(id);
      expect(adapter.retailerId).toBe(id);
    },
  );

  it('throws for unknown retailer', () => {
    expect(() => getAdapter('unknown-retailer')).toThrowError(
      /No scraper adapter registered/,
    );
  });
});
