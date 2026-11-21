// The thief: movement, wall sliding, sneaking, pebble throws and the
// noise her footsteps make. She never moves through a wall or a crate.
import {
  PLAYER_RADIUS,
  PLAYER_SNEAK_SPEED,
  PLAYER_WALK_SPEED,
  TILE,
  NOISE_RADIUS,
  PEBBLES_PER_LEVEL,
} from './config.js';
import { isSolidTile, isShadowTile } from './levels.js';
import { playFootstep, playPebble } from './audio.js';

export function createPlayer(startTile) {
  return {
    x: (startTile.col + 0.5) * TILE,
    y: (startTile.row + 0.5) * TILE,
    radius: PLAYER_RADIUS,
    facing: 0,
    sneaking: false,
    moving: false,
    pebbles: PEBBLES_PER_LEVEL,
    stepTimer: 0,
    stepAlternate: false,
    noiseRings: [], // expanding rings guards can hear
  };
}

function tileIsSolid(parsed, col, row) {
  if (col < 0 || row < 0 || col >= 24 || row >= 15) return true;
  return isSolidTile(parsed, col, row);
}

// Circle-vs-tile collision: try the full step, then each axis alone,
// so the thief slides along walls instead of sticking to them.
function tryMove(player, parsed, dx, dy) {
  const r = player.radius;
  function freeAt(x, y) {
    const cols = [Math.floor((x - r) / TILE), Math.floor((x + r) / TILE)];
    const rows = [Math.floor((y - r) / TILE), Math.floor((y + r) / TILE)];
    for (const col of cols) {
      for (const row of rows) {
        if (tileIsSolid(parsed, col, row)) return false;
      }
    }
    return true;
  }
  if (freeAt(player.x + dx, player.y + dy)) {
    player.x += dx;
    player.y += dy;
  } else if (freeAt(player.x + dx, player.y)) {
    player.x += dx;
  } else if (freeAt(player.x, player.y + dy)) {
    player.y += dy;
  }
}

export function updatePlayer(player, parsed, input, dt) {
  const move = input.moveVector();
  player.sneaking = input.isSneaking();
  player.moving = move.x !== 0 || move.y !== 0;
  const speed = player.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  if (player.moving) {
    player.facing = Math.atan2(move.y, move.x);
    tryMove(player, parsed, move.x * speed * dt, move.y * speed * dt);
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.sneaking ? 0.55 : 0.34;
      player.stepAlternate = !player.stepAlternate;
      playFootstep(player.sneaking, player.stepAlternate);
      if (!player.sneaking) {
        player.noiseRings.push({ x: player.x, y: player.y, radius: 6, max: NOISE_RADIUS });
      }
    }
  }
  for (const ring of player.noiseRings) ring.radius += 260 * dt;
  player.noiseRings = player.noiseRings.filter((ring) => ring.radius < ring.max);
}

// Is the thief standing on a shadow rug right now?
export function playerIsHidden(player, parsed) {
  return isShadowTile(parsed, player.x, player.y);
}

// Throw a pebble toward a canvas point. Returns the landing spot or null.
export function throwPebble(player, targetX, targetY) {
  if (player.pebbles <= 0) return null;
  player.pebbles -= 1;
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const dist = Math.hypot(dx, dy);
  const reach = Math.min(dist, 260);
  const landing = {
    x: player.x + (dist === 0 ? 0 : (dx / dist) * reach),
    y: player.y + (dist === 0 ? 0 : (dy / dist) * reach),
  };
  playPebble();
  return landing;
}
