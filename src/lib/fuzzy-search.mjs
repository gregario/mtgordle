/**
 * Fuzzy search engine for MTGordle autocomplete.
 *
 * Two-pass approach for performance on ~36K card names:
 * 1. Fast prefix/substring filter (handles exact partial matches)
 * 2. Fuse.js fuzzy fallback (handles typos)
 *
 * Nickname resolution is checked first — nickname matches
 * always rank above name matches.
 *
 * Exported as .mjs so Node.js test runner can import directly.
 */

import Fuse from 'fuse.js';

const MAX_RESULTS = 10;

/**
 * @typedef {{ name: string; matchedNickname?: string }} SearchResult
 * @typedef {{ name: string; nicknames: string[] }} NicknameEntry
 */

/**
 * Create a search engine from the autocomplete index and optional nickname map.
 *
 * @param {string[]} names - Full autocomplete index (all Oracle card names)
 * @param {NicknameEntry[]} nicknameEntries - Cards with nicknames from curated pool
 * @returns {{ search: (query: string) => SearchResult[] }}
 */
export function createSearchEngine(names, nicknameEntries = []) {
  // Pre-compute lowercase names for fast substring matching
  const lowerNames = names.map(n => n.toLowerCase());

  // Build Fuse index eagerly so first fuzzy query is fast
  const nameItems = names.map(name => ({ name }));
  const fuse = new Fuse(nameItems, {
    keys: ['name'],
    threshold: 0.35,
    distance: 100,
    includeScore: true,
    minMatchCharLength: 2,
    shouldSort: true,
  });

  // Build nickname lookup
  const nicknameItems = [];
  for (const entry of nicknameEntries) {
    for (const nick of entry.nicknames) {
      nicknameItems.push({ nickname: nick, nickLower: nick.toLowerCase(), realName: entry.name });
    }
  }

  let _nickFuse = null;
  function getNickFuse() {
    if (!_nickFuse && nicknameItems.length > 0) {
      _nickFuse = new Fuse(nicknameItems, {
        keys: ['nickname'],
        threshold: 0.3,
        includeScore: true,
        shouldSort: true,
      });
    }
    return _nickFuse;
  }

  /**
   * Fast multi-word search. All query words must appear in the name.
   * Prefix matches (first word matches start of name) rank higher.
   */
  function substringSearch(query, limit) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const firstWord = words[0];
    const prefixMatches = [];
    const containsMatches = [];

    for (let i = 0; i < lowerNames.length; i++) {
      const ln = lowerNames[i];

      // All words must appear in the name
      let allMatch = true;
      for (const w of words) {
        if (!ln.includes(w)) { allMatch = false; break; }
      }
      if (!allMatch) continue;

      if (ln.startsWith(firstWord)) {
        prefixMatches.push(names[i]);
      } else {
        containsMatches.push(names[i]);
      }

      if (prefixMatches.length >= limit && containsMatches.length >= limit) break;
    }

    return [...prefixMatches.slice(0, limit), ...containsMatches].slice(0, limit);
  }

  return {
    /**
     * Search for card names matching the query.
     * @param {string} query
     * @returns {SearchResult[]}
     */
    search(query) {
      const trimmed = query.trim().slice(0, 50);
      if (!trimmed) return [];

      const results = [];
      const seen = new Set();

      // 1. Check nickname matches first
      const nickFuse = getNickFuse();
      if (nickFuse) {
        // Fast exact nickname check first
        const qLower = trimmed.toLowerCase();
        for (const ni of nicknameItems) {
          if (ni.nickLower === qLower || ni.nickLower.startsWith(qLower)) {
            if (!seen.has(ni.realName)) {
              seen.add(ni.realName);
              results.push({ name: ni.realName, matchedNickname: ni.nickname });
            }
          }
        }
        // Fuzzy nickname search if no exact hits
        if (results.length === 0) {
          const nickResults = nickFuse.search(trimmed, { limit: 3 });
          for (const nr of nickResults) {
            if (!seen.has(nr.item.realName)) {
              seen.add(nr.item.realName);
              results.push({ name: nr.item.realName, matchedNickname: nr.item.nickname });
            }
          }
        }
      }

      // 2. Fast substring search
      const substringHits = substringSearch(trimmed, MAX_RESULTS);
      for (const name of substringHits) {
        if (!seen.has(name)) {
          seen.add(name);
          results.push({ name });
        }
        if (results.length >= MAX_RESULTS) break;
      }

      // 3. If we don't have enough results, fall back to Fuse.js fuzzy
      //    For long queries, use only the first 2 words to keep Fuse fast on 36K items.
      if (results.length < MAX_RESULTS) {
        const fuseQuery = trimmed.split(/\s+/).slice(0, 2).join(' ');
        const fuseResults = fuse.search(fuseQuery, { limit: MAX_RESULTS });
        for (const fr of fuseResults) {
          if (!seen.has(fr.item.name)) {
            seen.add(fr.item.name);
            results.push({ name: fr.item.name });
          }
          if (results.length >= MAX_RESULTS) break;
        }
      }

      return results.slice(0, MAX_RESULTS);
    },
  };
}
