# Maze Adventure

Colorful generated mazes for kids, mainly ages 4–6, with harder difficulties for older kids and adults.

Play at https://jmitchell238.github.io/maze-adventure/

There's a separate page for parents in [PARENTS.md](./PARENTS.md).

## Modes

| Mode | Description |
|------|-------------|
| Adventure | 12 story stages that unlock new themes and characters |
| Quick maze | Easy to Very Hard, with a new maze every time |
| Daily maze | One maze per day for each difficulty, works offline |
| Free play | Choose the size, loops, stars, theme and guidance yourself |

## Controls

| Input | Action |
|-------|--------|
| Tap the next square | Move one square (the default on touch screens) |
| Arrow keys / WASD | Move |
| Touch drag | Virtual stick (optional) |
| H / ? | Hint |
| R / ↻ | Restart |
| Esc | Pause |
| Gamepad | Stick or D-pad to move, A for a hint, Start to pause, Y to restart |

On Hard and above, some mazes have a yellow switch that opens a locked gate on the path.

## Themes

Enchanted Garden, Toy Castle, Candy Kingdom, Dinosaur Valley, Snowy Wonderland, Underwater Reef, Pirate Island and Space Station.

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

## Docs

| Doc | Covers |
|-----|--------|
| [ARCHITECTURE.md](./docs/maze-game/ARCHITECTURE.md) | Layers and file layout |
| [GAME_DESIGN.md](./docs/maze-game/GAME_DESIGN.md) | How the game should feel to play |
| [MAZE_GENERATION.md](./docs/maze-game/MAZE_GENERATION.md) | How mazes are generated |
| [ART_DIRECTION.md](./docs/maze-game/ART_DIRECTION.md) | Visual style |
| [TESTING_PLAN.md](./docs/maze-game/TESTING_PLAN.md) | Testing |
| [ROADMAP.md](./docs/maze-game/ROADMAP.md) | Milestones |

## Versioning

`GAME_VERSION` is in `js/config/index.js`. When you bump it, set `CACHE` in `sw.js` to `'maze-adventure-' + GAME_VERSION`. The tests check that they match.
