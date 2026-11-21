// Screenshot staging: reads ?shot= from the URL and poses the game so a
// single frame tells the story — title, mid-play, a tense near-miss, or
// the victory screen. Only used for the maker's own screenshots.
import { TILE } from './config.js';

function placeAt(actor, col, row) {
  actor.x = (col + 0.5) * TILE;
  actor.y = (row + 0.5) * TILE;
}

export function applyShot(api) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  const { game } = api;
  if (shot === 'title') {
    return; // the title screen is the default state
  }
  if (shot === 'play') {
    api.startGame();
    placeAt(game.player, 10, 7);
    game.player.facing = Math.PI / 2;
    const guardA = game.guards[0];
    placeAt(guardA, 7, 4);
    guardA.facing = Math.PI / 2;
    guardA.waypointIndex = 1;
    const guardB = game.guards[1];
    placeAt(guardB, 20, 7);
    guardB.facing = Math.PI;
    guardB.waypointIndex = 1;
    return;
  }
  if (shot === 'tense') {
    api.loadLevel(1);
    api.setScreen('playing');
    // The thief crouches on a shadow rug while a suspicious warden stares
    // down the row: hidden in the dark, so suspicion cools slowly instead
    // of tripping the alarm before the frame is taken.
    placeAt(game.player, 18, 9);
    game.player.facing = Math.PI;
    const guard = game.guards[1];
    placeAt(guard, 20, 9);
    guard.facing = Math.PI;
    guard.state = 'suspicious';
    guard.awareness = 72;
    guard.lastSeen = { x: game.player.x, y: game.player.y };
    const guardTop = game.guards[0];
    placeAt(guardTop, 12, 2);
    guardTop.facing = Math.PI / 2;
    return;
  }
  if (shot === 'win') {
    api.startGame();
    game.score = 1250;
    game.totalTime = 187;
    game.elapsed = 0;
    api.setScreen('victory');
  }
}
