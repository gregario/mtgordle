/** The four card pool identifiers */
export type CardPool =
  | 'simple-daily'
  | 'cryptic-daily'
  | 'simple-practice'
  | 'cryptic-practice';

/** A curated MTG card entry in our data set */
export interface Card {
  oracle_id: string;
  name: string;
  mana_cost: string;              // e.g. "{2}{U}{B}"
  color_identity: string[];       // e.g. ["U", "B"]
  type_line: string;              // e.g. "Legendary Creature — Wizard"
  oracle_text: string;            // full rules text
  oracle_text_first_line: string; // first paragraph of rules text
  flavor_text: string | null;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | 'special';
  set: string;                    // set code, e.g. "isd"
  set_name: string;               // e.g. "Innistrad"
  artist: string;
  image_uri: string;              // Scryfall normal image URI
  art_crop_uri: string;           // Scryfall art_crop URI
  set_era: string;                // human-readable era label
  lore_blurb: string;             // flavor text or generated placeholder
  nicknames: string[];            // community nicknames (empty at foundation)
  pool: CardPool;
}

/** Game tier */
export type GameTier = 'simple' | 'cryptic';

/** Mode for a given session */
export type GameMode = 'daily' | 'practice';

/** Status of a single clue reveal */
export type ClueStatus = 'locked' | 'revealed' | 'passed';

/** What happened in a given round */
export type RoundAction =
  | { type: 'pass' }
  | { type: 'guess'; name: string; isCorrect: boolean };

/** One guess attempt */
export interface GuessAttempt {
  name: string;
  isCorrect: boolean;
  timestamp: number;
}

/** State for one active game */
export interface GameState {
  tier: GameTier;
  mode: GameMode;
  puzzleNumber: number;       // 1-based; for practice: -1
  cardIndex: number;          // 0-based index into the pool
  cluesRevealed: number;      // 0–6 clues revealed so far
  guesses: GuessAttempt[];
  solved: boolean;
  gaveUp: boolean;
  startedAt: number;          // timestamp
  completedAt: number | null; // timestamp
}

/** Final result stored for a completed game */
export interface GameResult {
  tier: GameTier;
  mode: GameMode;
  puzzleNumber: number;
  solved: boolean;
  guessCount: number;
  cluesUsed: number;
  completedAt: number;
}

/** Per-tier player statistics */
export interface TierStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedPuzzle: number | null;
  guessDistribution: Record<number, number>; // guessCount → frequency
}

/** Overall player statistics stored in localStorage */
export interface PlayerStats {
  simple: TierStats;
  cryptic: TierStats;
}
