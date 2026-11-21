// Shared tuning and palette for Lanternshade. One place for every number
// that shapes how the game feels, so levels and AI read from the same truth.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 600

export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_SNEAK_SPEED = 82;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 148;
export const GUARD_INVESTIGATE_SPEED = 96;

export const GUARD_VIEW_RANGE = 205;
export const GUARD_VIEW_HALF_ANGLE = 0.61; // ~35 degrees each side
export const GUARD_SNEAK_RANGE_FACTOR = 0.55;
export const GUARD_CLOSE_RANGE = 68; // sees you even in shadow this close
export const GUARD_CATCH_DISTANCE = 22;

export const AWARENESS_GAIN = 55; // per second at point blank, scaled by closeness
export const AWARENESS_DECAY = 12; // per second while unseen
export const SUSPICIOUS_AT = 45; // guard stops and stares
export const ALARM_AT = 100; // guard gives chase
export const CHASE_MEMORY_SECONDS = 3.0; // keeps hunting after losing sight
export const ALARM_COOLDOWN_SECONDS = 4.0;

export const NOISE_RADIUS = 150; // running footsteps heard this far
export const PEBBLES_PER_LEVEL = 3;

export const PALETTE = {
  floorA: '#232a42',
  floorB: '#1e2438',
  floorLine: '#2c3552',
  wall: '#454f6e',
  wallTop: '#5d688f',
  wallEdge: '#141828',
  crate: '#6b4f2a',
  crateTop: '#8a6a3c',
  crateEdge: '#2e2110',
  shadow: '#10142a',
  shadowEdge: '#2a3458',
  exit: '#39d98a',
  exitGlow: '#1d7a4a',
  shard: '#ffb02e',
  shardGlow: '#ff7a1a',
  player: '#2dd4bf',
  playerDark: '#0f766e',
  guard: '#e5484d',
  guardDark: '#7f1d1d',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 150, 40, 0.34)',
  coneAlarm: 'rgba(255, 60, 60, 0.42)',
  text: '#f4e3b2',
  textDim: '#9aa5c4',
  danger: '#ff5a5a',
};
