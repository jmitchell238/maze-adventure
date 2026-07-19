# Maze Adventure

Colorful **procedural toy mazes** for kids (ages 4–6 first) and challenge seekers on higher difficulties.

Part of the **Arcade Hub** library — static PWA on GitHub Pages, linked from the hub catalog.

**Version:** `1.2.003` · **Status:** Shipped + polish (Milestones 1–7, ship-ready)

See **[PARENTS.md](./PARENTS.md)** and **[DEPLOY.md](./DEPLOY.md)**.

**Play locally:**

```bash
cd maze-adventure
python3 -m http.server 8080
# open http://localhost:8080
```

**Planned live URL:** https://jmitchell238.github.io/maze-adventure/

## Modes

| Mode | Description |
|------|-------------|
| **Adventure** | 12 story stages · unlock themes & characters |
| **Quick maze** | Easy → Very Hard, new maze every time |
| **Daily maze** | One seed per day per difficulty (offline) |
| **Free play** | Parent panel: size, loops, stars, theme, guided |

## Controls

| Input | Action |
|-------|--------|
| Arrow keys / WASD | Move |
| Touch / drag | Virtual stick |
| Esc | Pause |
| H / ? | Hint |
| R / ↻ | Restart |
| Gamepad | Stick/D-pad move · A hint · Start pause · Y restart |

**Hard+:** yellow **switch** opens a **locked gate** on the path.

## Themes

Garden · Castle · Candy · Dinosaur Valley · Snow · Reef · Pirate · Space

## Stack

- Canvas 2D + DOM chrome (Arcade Hub family)
- ES modules (Ironvale-style layers)
- Seeded procedural mazes with BFS validation
- PWA (`manifest` + service worker)
- Tests: `node tests/run.mjs`

## Tests

```bash
npm test
```

## Planning docs

| Doc | Purpose |
|-----|---------|
| [docs/maze-game/ARCHITECTURE.md](./docs/maze-game/ARCHITECTURE.md) | Stack, layers, file tree |
| [docs/maze-game/GAME_DESIGN.md](./docs/maze-game/GAME_DESIGN.md) | Player experience |
| [docs/maze-game/ROADMAP.md](./docs/maze-game/ROADMAP.md) | Milestones |
| [docs/maze-game/MAZE_GENERATION.md](./docs/maze-game/MAZE_GENERATION.md) | Generation pipeline |
| [docs/maze-game/ART_DIRECTION.md](./docs/maze-game/ART_DIRECTION.md) | Visual direction |
| [docs/maze-game/TESTING_PLAN.md](./docs/maze-game/TESTING_PLAN.md) | Testing |

## Hub registration

Already listed in `arcade-hub/games.json` as `maze-adventure`. Deploy this repo to GitHub Pages for the live URL to work.
