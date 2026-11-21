// Warden AI: patrols a loop, grows suspicious when something crosses the
// vision cone, gives chase on a full alarm, investigates thrown pebbles
// and strange noises, then returns to the round. Awareness is gradual so
// the thief always gets a chance to slip away and recover.
import {
  ALARM_AT,
  ALARM_COOLDOWN_SECONDS,
  AWARENESS_DECAY,
  AWARENESS_GAIN,
  CHASE_MEMORY_SECONDS,
  GUARD_CATCH_DISTANCE,
  GUARD_CHASE_SPEED,
  GUARD_CLOSE_RANGE,
  GUARD_INVESTIGATE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_SNEAK_RANGE_FACTOR,
  GUARD_VIEW_RANGE,
  SUSPICIOUS_AT,
  TILE,
} from './config.js';
import { isInsideVisionCone, hasLineOfSight } from './vision.js';
import { playAlarm, playSuspicionTick } from './audio.js';

export function createGuard(def) {
  const start = def.path[0];
  return {
    x: (start[0] + 0.5) * TILE,
    y: (start[1] + 0.5) * TILE,
    facing: 0,
    path: def.path,
    pause: def.pause || 1,
    waypointIndex: 1 % def.path.length,
    pauseTimer: 0,
    state: 'patrol', // patrol | suspicious | chase | investigate | return
    awareness: 0,
    lastSeen: null,
    memoryTimer: 0,
    investigateTarget: null,
    tickTimer: 0,
    wasSuspicious: false,
  };
}

function waypointPixel(guard, index) {
  const [col, row] = guard.path[index];
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

function moveToward(guard, targetX, targetY, speed, dt) {
  const dx = targetX - guard.x;
  const dy = targetY - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  return dist - step < 2;
}

// Can this guard see the thief right now? Sneaking shrinks the range;
// shadow rugs hide her unless the guard is very close.
export function guardSeesPlayer(parsed, guard, player, playerHidden) {
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const range = GUARD_VIEW_RANGE * (player.sneaking ? GUARD_SNEAK_RANGE_FACTOR : 1);
  if (playerHidden && dist > GUARD_CLOSE_RANGE) return false;
  return isInsideVisionCone(parsed, guard, player.x, player.y, range);
}

export function updateGuard(guard, parsed, player, playerHidden, dt, onAlarm, onCaught) {
  const sees = guardSeesPlayer(parsed, guard, player, playerHidden);
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);

  // Awareness rises fast up close, slower at the edge of the cone.
  if (sees) {
    const closeness = 1 - dist / GUARD_VIEW_RANGE;
    const rate = AWARENESS_GAIN * (0.35 + 0.65 * closeness) * (player.sneaking ? 0.55 : 1);
    guard.awareness = Math.min(ALARM_AT, guard.awareness + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.memoryTimer = CHASE_MEMORY_SECONDS;
  } else if (guard.state !== 'chase') {
    guard.awareness = Math.max(0, guard.awareness - AWARENESS_DECAY * dt);
  }

  // Audible cue as suspicion climbs past each quarter.
  guard.tickTimer -= dt;
  if (guard.awareness >= SUSPICIOUS_AT && guard.tickTimer <= 0 && guard.state !== 'chase') {
    guard.tickTimer = 0.7;
    playSuspicionTick(guard.awareness);
  }

  const justAlarmed = guard.state !== 'chase' && guard.awareness >= ALARM_AT;
  if (justAlarmed) {
    guard.state = 'chase';
    playAlarm();
    if (onAlarm) onAlarm(guard);
  }

  switch (guard.state) {
    case 'patrol': {
      if (guard.awareness >= SUSPICIOUS_AT) {
        guard.state = 'suspicious';
        break;
      }
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        break;
      }
      const target = waypointPixel(guard, guard.waypointIndex);
      if (moveToward(guard, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.path.length;
        guard.pauseTimer = guard.pause;
      }
      break;
    }
    case 'suspicious': {
      // Stop, turn toward the glimpse, and stare it down.
      if (guard.lastSeen) {
        guard.facing = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
      }
      if (guard.awareness < SUSPICIOUS_AT * 0.5) {
        guard.state = 'patrol';
        guard.awareness = 0;
      }
      break;
    }
    case 'chase': {
      const target = guard.lastSeen || { x: player.x, y: player.y };
      moveToward(guard, target.x, target.y, GUARD_CHASE_SPEED, dt);
      if (dist <= GUARD_CATCH_DISTANCE && hasLineOfSight(parsed, guard.x, guard.y, player.x, player.y)) {
        if (onCaught) onCaught(guard);
        return;
      }
      if (!sees) {
        guard.memoryTimer -= dt;
        if (guard.memoryTimer <= 0) {
          guard.state = 'investigate';
          guard.investigateTarget = guard.lastSeen;
        }
      }
      break;
    }
    case 'investigate': {
      const target = guard.investigateTarget || waypointPixel(guard, guard.waypointIndex);
      if (moveToward(guard, target.x, target.y, GUARD_INVESTIGATE_SPEED, dt)) {
        guard.state = 'return';
      }
      if (sees && guard.awareness < ALARM_AT) {
        guard.state = 'suspicious';
      }
      break;
    }
    case 'return': {
      const target = waypointPixel(guard, guard.waypointIndex);
      if (moveToward(guard, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
        guard.state = 'patrol';
        guard.awareness = 0;
      }
      break;
    }
    default:
      guard.state = 'patrol';
  }

  // A chasing guard that lost the trail cools down instead of hunting forever.
  if (guard.state === 'chase' && !sees) {
    guard.awareness = Math.max(SUSPICIOUS_AT, guard.awareness - (AWARENESS_DECAY * 0.5) * dt);
  }
  guard.wasSuspicious = guard.awareness >= SUSPICIOUS_AT;
}

// Send the nearest patrolling guard to check a noise.
export function distractGuards(guards, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const guard of guards) {
    if (guard.state === 'chase') continue;
    const d = Math.hypot(guard.x - x, guard.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = guard;
    }
  }
  if (best && bestDist < 420) {
    best.state = 'investigate';
    best.investigateTarget = { x, y };
    best.awareness = Math.max(best.awareness, SUSPICIOUS_AT * 0.6);
  }
  return best;
}

export function guardAlertLevel(guards) {
  if (guards.some((g) => g.state === 'chase')) return 'alarm';
  if (guards.some((g) => g.awareness >= SUSPICIOUS_AT)) return 'suspicious';
  return 'calm';
}

export { ALARM_COOLDOWN_SECONDS };
