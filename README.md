# 🍜 NoodleGames

**[noodlegames.co](https://noodlegames.co)**

A collection of quick, fun mini games you can play in your browser. No accounts, no downloads — just pick a game and play.

## Games

| Game | Description | Status |
|------|-------------|--------|
| 🔢 Sequence | Arrange six items in the correct order based on a daily prompt. Three attempts to get it right. | Live |
| 🎯 Odd One Out | Pick the one word that does not belong. New daily puzzles across multiple difficulties. | Live |
| 🔗 Chain Link | Draw a path through a 4×4 word grid where every step forms a compound word. One chain per day. | Live |
| 🎯 Zero In | Five classified clues, one hidden target. The earlier you guess right, the higher your score. | Live |
| 🪢 Knot | Find the word that follows three clues to form a compound word. New puzzle daily. | Live |
| ⚡ Pathways | Connect matching colored pairs with a single line and fill every cell. New grid daily. | Live |
| 🌱 Sprout | A crossword that grows as you solve it — only the seed word shows at first, and each answer sprouts its hidden neighbors into view. | Live |

Each game lives in its own repo (`sequence`, `odd_one_out`, `chain_link`, `zero_in`, `knot`, `pathways`, `sprout`), listed here via `src/data/games.js`.

## Dev Setup

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

Builds the app and pushes to the `gh-pages` branch. Make sure GitHub Pages is set to deploy from `gh-pages` / `root`.

## Tech

- React + Vite
- React Router
- Deployed via gh-pages to GitHub Pages with custom domain

## License

MIT
