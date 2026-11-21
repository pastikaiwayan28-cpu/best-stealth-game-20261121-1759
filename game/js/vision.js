// Sight checks: can a guard see a point, and is that point inside
// the guard's vision cone? Walls and crates block sight.
import { GUARD_VIEW_RANGE, GUARD_VIEW_HALF_ANGLE, TILE } from './config.js';
import { isSolidTile } from './levels.js';

// Bresenham walk over tiles between two pixel points. Returns false the
// moment a solid tile stands between them.
export function hasLineOfSight(parsed, x0, y0, x1, y1) {
  let col0 = Math.floor(x0 / TILE);
  let row0 = Math.floor(y0 / TILE);
  const col1 = Math.floor(x1 / TILE);
  const row1 = Math.floor(y1 / TILE);
  const dCol = Math.abs(col1 - col0);
  const dRow = Math.abs(row1 - row0);
  const stepCol = col0 < col1 ? 1 : -1;
  const stepRow = row0 < row1 ? 1 : -1;
  let err = dCol - dRow;
  for (let guard = 0; guard < 64; guard += 1) {
    if (col0 === col1 && row0 === row1) return true;
    // Skip the tiles the two actors themselves stand on.
    if (!(col0 === Math.floor(x0 / TILE) && row0 === Math.floor(y0 / TILE))
      && !(col0 === col1 && row0 === row1)
      && isSolidTile(parsed, col0, row0)) {
      return false;
    }
    const err2 = 2 * err;
    if (err2 > -dRow) {
      err -= dRow;
      col0 += stepCol;
    }
    if (err2 < dCol) {
      err += dCol;
      row0 += stepRow;
    }
  }
  return true;
}

// Is the target inside the guard's cone? Range, angle and line of sight.
export function isInsideVisionCone(parsed, guard, targetX, targetY, range) {
  const dx = targetX - guard.x;
  const dy = targetY - guard.y;
  const dist = Math.hypot(dx, dy);
  const viewRange = range ?? GUARD_VIEW_RANGE;
  if (dist > viewRange) return false;
  if (dist < 1) return true;
  const angleToTarget = Math.atan2(dy, dx);
  let diff = angleToTarget - guard.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > GUARD_VIEW_HALF_ANGLE) return false;
  return hasLineOfSight(parsed, guard.x, guard.y, targetX, targetY);
}

// How far the cone reaches before a wall or crate cuts it, for drawing.
export function coneRayLength(parsed, guard, angle) {
  const step = 8;
  let dist = step;
  while (dist <= GUARD_VIEW_RANGE) {
    const x = guard.x + Math.cos(angle) * dist;
    const y = guard.y + Math.sin(angle) * dist;
    if (isSolidTile(parsed, Math.floor(x / TILE), Math.floor(y / TILE))) return dist;
    dist += step;
  }
  return GUARD_VIEW_RANGE;
}
