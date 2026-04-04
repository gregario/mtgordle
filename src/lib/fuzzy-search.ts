/**
 * TypeScript wrapper for the fuzzy search engine.
 * The core logic lives in fuzzy-search.mjs (importable by Node test runner).
 * This file re-exports with TypeScript types for React components.
 */

export { createSearchEngine } from './fuzzy-search.mjs';

export interface SearchResult {
  name: string;
  matchedNickname?: string;
}

export interface NicknameEntry {
  name: string;
  nicknames: string[];
}

export interface SearchEngine {
  search(query: string): SearchResult[];
}
