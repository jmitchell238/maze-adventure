# Maze Adventure — Game Design

**Audience:** Ages 4–6 primary; Medium–Very Hard for older kids and adults  
**Tone:** Warm, playful, encouraging toy-world adventure — never punishing  

---

## 1. Elevator pitch

Help a lovable character find their way through a colorful **toy maze** — from the glowing entrance to a sparkling goal. Every maze is **brand new** (procedural), always solvable, and dressed as a miniature storybook world.

---

## 2. Core loop

```
Pick mode / difficulty
        ↓
Maze generates (validated, themed)
        ↓
Player explores corridors
        ↓
Optional collectibles + optional hints
        ↓
Reach goal → short celebration
        ↓
Next maze / Replay / Hub
```

There are **no lives**, **no game-over fail state**, and **no permanent penalties**. Dead ends are exploration, not failure. Optional gentle hints exist instead of scolding.

---

## 3. Fantasy and objectives

Each run pairs a **character** with a **goal object** so the maze feels like a tiny story, not a worksheet.

| Character | Example goal | Theme fit |
|-----------|--------------|-----------|
| Friendly explorer | Treasure chest | Garden / Castle |
| Small dinosaur | Egg | Dinosaur Valley (later) |
| Puppy | Bone | Garden / Castle |
| Kitten | Ball of yarn | Candy / Garden |
| Robot | Battery / home base | Space Station (later) |
| Little spaceship | Planet / hangar | Space Station (later) |
| Knight | Castle gate | Toy Castle |
| Bee | Flower | Enchanted Garden |

**v1 unlock defaults:** Explorer + treasure (Garden); Knight + castle (Castle); Kitten + yarn (Candy).

UI copy stays **icon-first**: big pictures of character → goal. Minimal text (“Find it!” with a picture of the goal).

---

## 4. Game modes

### 4.1 Quick Maze (first shippable mode — Milestone 3)

Player taps **Easy / Medium / Hard / Very Hard**. Instant generate + play.

### 4.2 Daily Maze (architecture ready; implement Milestone 4+)

One maze per calendar day **per difficulty**, seed derived from local date string + difficulty id. No network required. Mark complete in save.

### 4.3 Adventure Mode (Milestone 6+)

Linear stage list that ramps difficulty and unlocks themes/characters. Progress persisted.

### 4.4 Parent / Free Play Mode (Milestone 6+)

Sliders / chips for:

- Size / difficulty profile  
- Hints on/off  
- Timer on/off  
- Collectible density  
- Theme  
- Movement style  
- Camera full vs follow  

---

## 5. Difficulty design (player-facing)

| Level | Ages (feel) | Maze feel | Help |
|-------|-------------|-----------|------|
| **Easy** | 4–6 | Small, open, short path, wide corridors, full view | Guided move, path glow, unlimited hints, no timer |
| **Medium** | 6–9 | Bigger, more branches, light loops | Hints available, optional free move |
| **Hard** | 9+ / adults casual | Long routes, misleading branches | Fewer automatic helps; optional timer score |
| **Very Hard** | Challenge | Large, loopy, follow camera | Hints manual only; optional score timer |

Difficulty is **measured** (see MAZE_GENERATION.md), not only grid size.

---

## 6. Controls (child-friendly)

### Desktop

- **Arrow keys / WASD** — move  
- **Esc** — pause / menu  
- **H** — hint  
- **R** — restart same seed (or confirm on Easy)  

### Touch / tablet

- **Tap adjacent open cell** — primary (default; most natural for young kids)  
- **Drag** for virtual joystick — optional secondary  
- **No tiny D-pads**  

### Rules

- Cannot phase through walls when dragging quickly  
- Easy default = **guided** corridor following  
- Pause and restart always available with large icons  

---

## 7. Hints

- Sourced from **precomputed shortest path** (BFS), never random guessing  
- Visual options (theme-tinted):  
  - Soft glow on next corridor segment  
  - Footprint sparkles a few cells ahead  
  - Brief full-path shimmer (Easy / accessibility)  
- **Unlimited** on Easy  
- Cooldown optional on Hard+ (never zero for accessibility high-help setting)  
- No “you failed” or hint-shaming UI  

---

## 8. Collectibles

- Optional stars/gems/fruit along **reachable path cells**  
- Easy: prefer near solution path  
- Not required to finish  
- Pickup: bounce animation + cheerful SFX + small particles  
- Win screen shows count as celebration, not grade  

---

## 9. Scoring (secondary)

Factors (positive only; never punish kids harshly):

- Maze completed (primary)  
- Collectibles found  
- Hints used (mild bonus for fewer on Hard+ only; ignore on Easy)  
- Optional time on Hard+  

Easy win screen emphasizes **stars and cheer**, not numeric ranking.

---

## 10. Victory experience

1. Goal plays open/sparkle animation  
2. Confetti / theme particles (skippable, reduced if reduced-motion)  
3. Character happy bounce  
4. Cheer SFX  
5. Big **Next Maze** button  
6. **Replay** and **Home** (menu / Arcade Hub)  

Celebration ≤ ~2s auto-phase; buttons active immediately.

---

## 11. Pause / safety

- Pause freezes movement and timer  
- Resume, Restart, Menu, Mute  
- SW auto-update may wait until menu/win (match Bottle Sort pattern)  

---

## 12. What we deliberately avoid

- Lives / health bars that empty  
- Harsh red fail screens  
- Ads, timers on Easy, loot boxes, energy systems  
- Worksheet aesthetic (black lines on white)  
- Cluttered adult dungeon gore  
- Reading-required tutorials as the only onboarding  

---

## 13. Onboarding (no reading required)

1. First launch: auto-start **Easy** garden maze after a 1-screen icon tutorial (finger moves character toward glowing goal icon).  
2. Optional “How to play” with pictures.  
3. Entrance and exit always **animated and high contrast**.  

---

## 14. Parent trust goals

- Offline-capable after install  
- No external trackers  
- Predictable save data on device only  
- Free Play for customizing challenge for mixed-age siblings  

---

## 15. Success metrics (qualitative)

- A 4-year-old can finish Easy with touch and smiling  
- A 6-year-old can try Medium without rage-quitting wall collisions  
- Parents understand Next / Replay without instructions  
- Maze always looks intentional and toy-like, never like debug grid  
