## [0.2.0] - 2026-04-05

### Added
- Automatic dark mode support — the game now follows your system's light/dark preference with no manual toggle needed
- Mobile-first responsive layout — the game column is centered on desktop and scales naturally on all screen sizes
- Spoiler protection for shared links — inbound share URLs no longer reveal the answer before you've played
- Practice mode — unlimited practice rounds using a separate card pool, with Play Again and Back to Home controls
- Win percentage and streak tracking — daily and practice stats persist locally, with missed-day streak reset
- Score distribution chart — personal bar chart showing your guess distribution across all sessions
- Share your result — copy a spoiler-free emoji grid to share on social after solving
- Lore blurb on post-solve — reveals card flavor text after each solve
- Full autocomplete card search — type any card name and get fuzzy-matched suggestions from a 930-card curated pool

### Changed
- Desktop layout now caps at 480px wide and centers in the viewport for a focused card-game feel
- Mana symbols and card attributes render inline — no external image dependencies

### Fixed
- Stats engine now migrates safely from legacy localStorage format without data loss
- Post-solve share button no longer leaks a timeout reference on unmount
