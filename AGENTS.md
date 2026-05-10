# AGENTS.md - Super Liquid Soccer

## Build Commands

- `npm run build` → runs `node build.js`
- Build output: `dist/super-liquid-soccer.html` (single HTML file with everything embedded)
- Development: Open `index.html` directly in browser

## Build Process (node build.js)

1. Embeds images from `escudos/` folder as base64 data URIs into `equipos-inline.js`
2. Concatenates: equipos-inline.js + game-data.js + league-engine.js + game-ui.js + game-engine.js
3. Minifies JS with Terser
4. Optionally obfuscates with JavaScript-Obfuscator (fails gracefully if not installed)
5. Minifies CSS
6. Generates single HTML in `dist/`

## Source Files (load order)

1. `equipos-inline.js` - Team data with inline base64 images
2. `game-data.js` - Game data/constants
3. `league-engine.js` - League logic
4. `game-ui.js` - UI logic
5. `game-engine.js` - Core game engine

Entry point: `index.html`

## Scripts

- `npm test` - Placeholder (exits with error)
- `npm run build` - Production build

## Notes

- No test suite exists
- No linting/formatting config
- Dependencies in package.json include playwright but it's not used in the build