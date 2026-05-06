export { parseName, sortedTokens } from './normalizer.js';
export type { ParsedName } from './normalizer.js';
export {
  matchProduct,
  AUTO_ACCEPT_THRESHOLD,
  REVIEW_THRESHOLD,
} from './fuzzy-match.js';
export type { MatchCandidate, MatchResult } from './fuzzy-match.js';
export { resolveProduct } from './product-resolver.js';
export type { ResolveOutcome } from './product-resolver.js';
