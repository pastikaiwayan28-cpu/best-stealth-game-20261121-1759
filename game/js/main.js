// Lanternshade entry point: wire the canvas, input, game and screenshot
// staging together, then expose a small handle for play-testing.
import { createInput } from './input.js';
import { createGame } from './game.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const input = createInput(canvas);
const api = createGame(canvas, input);
applyShot(api);

// Handle for the maker's own play-tests (keyboard driving, state reads).
window.__lantern = {
  game: api.game,
  start: () => api.startGame(),
  level: (index) => api.loadLevel(index),
  screen: (name) => api.setScreen(name),
};
