# Deploy Maze Adventure

## Local play (no deploy)

```bash
cd maze-adventure
python3 -m http.server 8080
# open http://localhost:8080
```

Use **http://localhost** (not `file://`) so ES modules and the service worker work.

## GitHub Pages

1. Create a public repo named `maze-adventure` under your GitHub user (or rename URLs below).
2. From this folder:

```bash
cd maze-adventure
git init
git add .
git commit -m "Maze Adventure 1.2.000"
git branch -M main
git remote add origin git@github.com:jmitchell238/maze-adventure.git
git push -u origin main
```

3. On GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / root**.
4. Live URL: `https://jmitchell238.github.io/maze-adventure/`

## Arcade Hub listing

Hub entry is already in `arcade-hub/games.json`. After the game Pages site is live:

```bash
cd arcade-hub
# confirm games.json url matches your Pages URL
git add games.json art/covers/maze-adventure.jpg js/config.js sw.js README.md
git commit -m "Add Maze Adventure to catalog"
git push
```

Bump hub version if you change covers/catalog again.

## Smoke check after deploy

- [ ] Game loads over https  
- [ ] Easy maze playable with touch  
- [ ] Adventure stage 1 starts  
- [ ] Hub “Play” opens the game  
- [ ] Install / Add to Home Screen works on a phone  

## Version bump checklist

1. `js/config/index.js` → `GAME_VERSION`  
2. `sw.js` → `CACHE = 'maze-adventure-' + same version`  
3. `npm test`  
4. Commit & push  
