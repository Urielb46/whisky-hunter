export { typesense, isTypesenseConfigured } from './client.js';
export { ensureCollection, resetCollection, COLLECTION_NAME, COLLECTION_SCHEMA } from './collection.js';
export { searchWhiskies } from './search.js';
export { syncProductsToTypesense } from './indexer.js';
export type { WhiskyDocument, Searc