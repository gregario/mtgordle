'use client';

/**
 * GuessInput — autocomplete text input for guessing MTG card names.
 *
 * Loads the autocomplete index (~36K names) and curated card nicknames,
 * provides fuzzy search with a dropdown, and submits guesses on selection.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Card } from '@/types/card';
import type { SearchResult, SearchEngine, NicknameEntry } from '@/lib/fuzzy-search';

interface GuessInputProps {
  /** Curated cards for this game's pool (used for nickname resolution) */
  poolCards: Card[];
  /** Called when the player selects a card name as their guess */
  onGuess: (cardName: string) => void;
  /** Whether input should be disabled (game over, loading, etc.) */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

export default function GuessInput({ poolCards, onGuess, disabled = false, placeholder = 'Type a card name...' }: GuessInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [engine, setEngine] = useState<SearchEngine | null>(null);
  const [loading, setLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build nickname entries from pool cards
  const nicknameEntries = useMemo<NicknameEntry[]>(() =>
    poolCards
      .filter(c => c.nicknames && c.nicknames.length > 0)
      .map(c => ({ name: c.name, nicknames: c.nicknames })),
    [poolCards]
  );

  // Load autocomplete index and initialize search engine
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch('/data/autocomplete-index.json');
        if (!res.ok) throw new Error(`Failed to load autocomplete index: ${res.status}`);
        const names: string[] = await res.json();

        const { createSearchEngine } = await import('@/lib/fuzzy-search');

        if (!cancelled) {
          const eng = createSearchEngine(names, nicknameEntries) as SearchEngine;
          setEngine(eng);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize search engine:', err);
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [nicknameEntries]);

  // Search on query change
  useEffect(() => {
    if (!engine || query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const searchResults = engine.search(query);
    setResults(searchResults);
    setShowDropdown(searchResults.length > 0);
    setSelectedIndex(-1);
  }, [query, engine]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const submitGuess = useCallback((name: string) => {
    onGuess(name);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, [onGuess]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || results.length === 0) {
      // Allow Enter to submit typed text directly if no dropdown
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault();
        submitGuess(query.trim());
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          submitGuess(results[selectedIndex].name);
        } else if (results.length > 0) {
          // Submit top result
          submitGuess(results[0].name);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showDropdown, results, selectedIndex, query, submitGuess]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setShowDropdown(true);
        }}
        disabled={disabled || loading}
        placeholder={loading ? 'Loading cards...' : placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Guess a card name"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls="guess-dropdown"
        aria-activedescendant={selectedIndex >= 0 ? `guess-option-${selectedIndex}` : undefined}
        role="combobox"
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: 'var(--font-size-base)',
          fontFamily: 'var(--font-family)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '2px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          outline: 'none',
          transition: 'border-color 0.15s ease',
          ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        }}
      />

      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          id="guess-dropdown"
          role="listbox"
          aria-label="Card name suggestions"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 100,
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {results.map((result, idx) => (
            <div
              key={result.name}
              id={`guess-option-${idx}`}
              role="option"
              aria-selected={idx === selectedIndex}
              onClick={() => submitGuess(result.name)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                backgroundColor: idx === selectedIndex ? 'var(--color-accent)' : 'transparent',
                color: idx === selectedIndex ? '#fff' : 'var(--color-text)',
                borderBottom: idx < results.length - 1 ? '1px solid var(--color-border)' : 'none',
                transition: 'background-color 0.1s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <span>{result.name}</span>
              {result.matchedNickname && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: idx === selectedIndex ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  aka &ldquo;{result.matchedNickname}&rdquo;
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
