# Maze Adventure — Art Direction

**North star:** A premium children’s mobile toy-maze — physical playset energy, storybook color, soft 3D walls — **never** a classroom worksheet or debug grid.

Reference images supplied by the user were **unavailable on disk** at planning time (`AppData/Local/Temp/images.*` missing). Direction below follows the master brief and Arcade Hub’s neon-friendly family look, without copying any copyrighted maze app UI.

---

## 1. Visual pillars

1. **Readable first** — path vs wall is obvious at a glance for a 4-year-old.  
2. **Toy depth** — thick walls, soft shadows, rounded corners, subtle top highlights.  
3. **Warm storybook color** — saturated but friendly; no grimdark.  
4. **Alive but calm** — gentle idle motion; no seizure strobes.  
5. **Character clarity** — player silhouette pops against floor and walls.  

---

## 2. Anti-goals (explicit reject list)

| Do not ship | Why |
|-------------|-----|
| Thin black lines on white | Worksheet look |
| Plain HTML/CSS grid borders as the maze | Feels unfinished |
| Flat green rectangles as “walls” | Programmer art |
| Adult dungeon clutter / blood / horror | Wrong audience |
| Decoration that hides corridor openings | Breaks readability |
| Tiny unreadable icons | Ages 4–6 |
| Harsh red fail full-screens | Anxiety |

Temporary Milestone 3 art may use **clean rounded fills** (still dimensional), but Milestone 5 must remove any “placeholder” feel.

---

## 3. Camera and presentation

- **Top-down** with optional **very slight** faux perspective on wall tops (draw wall top face + side face) — never enough angle to occlude paths.  
- Maze feels like a **miniature board** sitting on a soft themed table/cloth background.  
- Easy/Medium: **entire maze on screen** with padding.  
- Hard+: soft camera follow; keep player near center; show enough corridor context.  

Logical stage: portrait-friendly **390×700** (Arcade Hub family), letterboxed on tablets/desktops.

---

## 4. Maze construction (graphics)

### Floors

- Soft fill with subtle tile or grain  
- Slightly lighter along the “suggested” path on Easy (path glow), still clearly floor  
- Inner shadow under walls for depth  

### Walls

- **Thick** (visual width ~30–40% of cell for Easy; scale with cell size)  
- Rounded outer corners on wall runs where possible  
- Layers:  
  1. Drop shadow (soft ellipse / offset)  
  2. Side body (darker)  
  3. Top cap (lighter)  
  4. Specular strip on north/west edges  

### Entrance

- Arch, arrow ribbon, or glowing gate — always animated  
- Color distinct from walls (e.g. warm gold / leaf green)  

### Exit / goal

- Largest focal prop after the player  
- Pulse scale 1.0–1.08, sparkle particles  
- Icon matches story (chest, flower, castle, bone, …)  

---

## 5. Themes (v1 set)

| id | Name | Floor | Walls | Ambient | Goal vibe |
|----|------|-------|-------|---------|-----------|
| `garden` | Enchanted Garden | soft grass, daisy dots | hedge / wood pastel | petals, fireflies | flower / chest in grove |
| `castle` | Toy Castle | stone tiles warm gray | candy-brick / wood blocks | pennants, sparkles | castle keep / crown |
| `candy` | Candy Kingdom | frosting swirls | gumdrop / wafer | sugar sparkles | lollipop / gift |

Later data-only themes: Dinosaur Valley, Space Station, Pirate Island, Underwater Reef, Snowy Wonderland.

Each theme defines colors + decoration placement rules, not new generators.

---

## 6. Characters

- Large, round, high-contrast outlines  
- Readable at ~32–48 logical px body size on Easy  
- Idle bob; walk cycle = squash/stretch or 2-frame leg swap (canvas-drawn or sprite)  
- v1 can be **vector-drawn canvas characters** if sprites not ready — still must look cute, not stick figures  

Suggested v1 cast: Explorer, Knight, Kitten (match themes).

---

## 7. UI chrome (DOM)

Align with Arcade Hub / Bottle Sort family:

| Token | Value direction |
|-------|-----------------|
| Background | Deep navy `#070b16`–`#0a1024` behind stage |
| Text | `#eef2ff` |
| Accent (game) | Soft mint / coral `#7dffa0` / `#ff8fab` |
| Cards | Translucent dark panels, large radius (~20px) |
| Primary button | Huge, high contrast, emoji + short word |
| Font | System UI stack (Segoe / SF / Roboto) |

Menus:

- Icon-first difficulty cards (1 star → 4 stars)  
- Mute ghost button  
- Pause: ☰ large hit area  

---

## 8. Motion and VFX

| Effect | Use |
|--------|-----|
| Ambient motes | Theme dust / petals, low count |
| Collect burst | 8–16 particles, warm colors |
| Hint trail | Soft footprints or sparkles along next N cells |
| Win confetti | Theme-colored; reduced-motion → static stars |
| Screen shake | **None or tiny** (kids); prefer scale pop |

`reducedMotion` save flag disables idle floats and confetti density.

---

## 9. Lighting model (2D fake)

No real 3D engine. Approximate:

- Global soft light from **top-left**  
- Wall tops lighter; south/east faces darker  
- Player blob shadow under feet  
- Goal emissive glow (additive soft circle)  

---

## 10. Color accessibility

- Path floor luminance clearly higher than wall body  
- High-contrast mode: boost wall outline stroke, simplify floor noise  
- Never rely on red/green alone for critical info  

---

## 11. Production art pipeline (Milestone 5)

1. Lock theme palettes in `domain/themes.js`  
2. Draw walls/floors procedurally first (gradients) — baseline quality  
3. Optional sprite sheets for characters/goals under `assets/`  
4. Hub cover: 3:4 portrait, character + maze snippet + title-safe area  
5. Icons 180/192/512 PWA  

Procedural theme rendering is preferred for infinite mazes; sprites for hero/goal only is OK.

---

## 12. Milestone art quality bar

| Milestone | Allowed look |
|-----------|--------------|
| M3 | Clean rounded dimensional shapes, solid theme colors, readable |
| M4 | Hints/trails polished; UI icons clear |
| M5 | Full toy-board polish; no “temp” appearance |
| 1.0 | Cover art + three themes ship-ready |

---

## 13. Readability checklist (every theme)

- [ ] Can you trace entrance → exit with eyes half-closed?  
- [ ] Is the player the most salient moving object?  
- [ ] Do decorations sit on wall caps or off-path corners only?  
- [ ] Is the goal visible without scrolling on Easy?  
- [ ] Do colorblind-ish filters still separate path/wall?  

If decoration fails any check, remove decoration — never remove clarity.
