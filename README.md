# MTGordle

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue.svg" alt="PolyForm Noncommercial"></a>
  <a href="https://github.com/sponsors/gregario"><img src="https://img.shields.io/badge/sponsor-♥-ea4aaa.svg" alt="Sponsor"></a>
</p>

A daily Magic: The Gathering card guessing game with progressive clue reveals.

Each day, guess the mystery card as clues are revealed one by one. Six clues, from color identity to full art. How few clues do you need?

## How it works

1. Pick a difficulty tier: **Simple** (well-known cards) or **Cryptic** (deep cuts)
2. Clues reveal progressively: color identity -> mana cost -> type line -> keywords -> flavor text -> art
3. Guess at any point -- or pass to see the next clue
4. Share your result: `MTGordle #42 (Cryptic) Clue 3/6`

## Card Data

Card data sourced from [Scryfall](https://scryfall.com/). Card names, text, and images are property of Wizards of the Coast.

> MTGordle is unofficial Fan Content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. &copy;Wizards of the Coast LLC.

Data refreshes weekly via GitHub Action to include new card releases.

## Development

```bash
npm install
npm run build
npm start
```

## License

[PolyForm Noncommercial 1.0.0](LICENSE)

Free for personal and non-commercial use.
