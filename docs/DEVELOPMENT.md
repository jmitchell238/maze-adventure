# Development

## Running locally

```bash
npm start
```

This serves the folder on http://localhost:8080. The game uses ES modules, so opening `index.html` from disk won't work.

Canvas 2D for the maze, with regular HTML for the menus. Every generated maze is seeded and checked with a BFS to make sure it can be solved. Installable as a PWA.

## Tests

```bash
npm test
```

## Releasing

1. Bump `GAME_VERSION` in `js/config/index.js`.
2. Set `CACHE` in `sw.js` to `'maze-adventure-' + GAME_VERSION`. The tests check that they match.
3. Run `npm test`.
4. Push to `main`. Pages redeploys on its own.

Then check the live site:

- [ ] The game loads over HTTPS
- [ ] An Easy maze is playable with touch
- [ ] Adventure stage 1 starts
- [ ] Play in Arcade Hub opens the game
- [ ] Add to Home Screen works on a phone

## Design docs

| Doc | Covers |
|-----|--------|
| [ARCHITECTURE.md](maze-game/ARCHITECTURE.md) | Layers and file layout |
| [GAME_DESIGN.md](maze-game/GAME_DESIGN.md) | How the game should feel to play |
| [MAZE_GENERATION.md](maze-game/MAZE_GENERATION.md) | How mazes are generated |
| [ART_DIRECTION.md](maze-game/ART_DIRECTION.md) | Visual style |
| [TESTING_PLAN.md](maze-game/TESTING_PLAN.md) | Testing |
| [ROADMAP.md](maze-game/ROADMAP.md) | Milestones |
