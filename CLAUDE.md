# Luna's Snake Quest

## Projekt
Fantasy snake-spil til iPad til en 5-årig pige. Pure HTML5 Canvas + vanilla JS. Ingen frameworks.

## Tech
- HTML5 Canvas med devicePixelRatio scaling
- Vanilla JavaScript (ES modules)
- CSS for UI overlays
- PWA med Service Worker for offline
- localStorage for progress

## Regler
- INGEN npm, INGEN build step
- INGEN external requests (ads, tracking)
- Test med `python3 -m http.server 8080` eller `npx serve .`
- Commit ofte med beskrivende messages
- Touch: `touch-action: none` + preventDefault på touchmove
- Audio: Unlock AudioContext ved første user tap
- Canvas: Brug devicePixelRatio for Retina

## Filstruktur
- `index.html` — entry point
- `js/game.js` — game engine
- `js/input.js` — swipe detection
- `js/levels.js` — level definitions
- `js/ui.js` — menus/overlays
- `js/storage.js` — localStorage
- `js/audio.js` — lyd
- `js/snake-renderer.js` — canvas-tegnet slange med farve-tinting
- `css/styles.css` — styling
- `manifest.json` + `sw.js` — PWA
- `assets/backgrounds/` — genererede baggrunde
- `assets/sounds/` — lydeffekter
