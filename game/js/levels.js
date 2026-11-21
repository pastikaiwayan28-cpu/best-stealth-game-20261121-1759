// Level layouts for Lanternshade. Each map is 24 by 15 tiles:
//   # wall (blocks movement and sight)   . open floor
//   D shadow rug (hiding spot)           C crate (cover, blocks sight)
//   P player start   E exit   S ember shard
// Guard patrols are tile waypoints on open floor, walked in a loop.
export const LEVELS = [
  {
    name: 'The Quiet Gallery',
    sub: 'Two wardens. Learn their rounds, lift both shards, slip out.',
    map: [
      '########################',
      '#P...C......D....S.....#',
      '#......................#',
      '#..###.....###......#..#',
      '#......................#',
      '#..C.....D.....C.......#',
      '#......................#',
      '#....####...####.......#',
      '#......................#',
      '#..C.....D.....C.......#',
      '#......................#',
      '#..###.....###......#..#',
      '#......................#',
      '#...S......D.....E.....#',
      '########################',
    ],
    guards: [
      { path: [[3, 2], [20, 2]], pause: 1.6 },
      { path: [[20, 4], [20, 10]], pause: 1.2 },
    ],
  },
  {
    name: 'The Marble Hall',
    sub: 'Three wardens and longer sightlines. Shadows are your friends.',
    map: [
      '########################',
      '#P....C....D.....S.....#',
      '#......................#',
      '#.####...####....###...#',
      '#......................#',
      '#..C....D....C....D....#',
      '#......................#',
      '#...####...#####....#..#',
      '#......................#',
      '#..C....D....C....D....#',
      '#......................#',
      '#.####...####....###...#',
      '#......................#',
      '#..S.....D....C....E...#',
      '########################',
    ],
    guards: [
      { path: [[2, 2], [21, 2]], pause: 1.4 },
      { path: [[17, 4], [21, 4]], pause: 1.0 },
      { path: [[2, 12], [10, 12]], pause: 1.4 },
    ],
    // Third shard sits in the open hall at (21, 7); the map parser
    // picks up S tiles, this one is placed by extraShards below.
    extraShards: [[21, 7]],
  },
  {
    name: 'The Ember Vault',
    sub: 'Four wardens guard the last shards. Move slow, move sure.',
    map: [
      '########################',
      '#P..C....D...S....C....#',
      '#......................#',
      '#.###...####...###.....#',
      '#......................#',
      '#..C..D...C....D..C....#',
      '#......................#',
      '#..####..####..####....#',
      '#......................#',
      '#..C..D...C....D..C....#',
      '#......................#',
      '#.###...####...###.....#',
      '#......................#',
      '#.S...D....C....E...S..#',
      '########################',
    ],
    guards: [
      { path: [[2, 2], [21, 2]], pause: 1.2 },
      { path: [[21, 4], [21, 6]], pause: 0.8 },
      { path: [[2, 8], [10, 8]], pause: 1.2 },
      { path: [[13, 12], [21, 12]], pause: 1.0 },
    ],
  },
];

// Turn a level's raw map strings into grids the game can query.
export function parseLevelMap(level) {
  const walls = new Set();
  const crates = new Set();
  const shadows = new Set();
  const shards = [];
  let playerStart = null;
  let exitTile = null;
  const key = (col, row) => col + ',' + row;
  level.map.forEach((line, row) => {
    for (let col = 0; col < line.length; col += 1) {
      const ch = line[col];
      if (ch === '#') walls.add(key(col, row));
      else if (ch === 'C') crates.add(key(col, row));
      else if (ch === 'D') shadows.add(key(col, row));
      else if (ch === 'S') shards.push({ col, row });
      else if (ch === 'P') playerStart = { col, row };
      else if (ch === 'E') exitTile = { col, row };
    }
  });
  (level.extraShards || []).forEach(([col, row]) => shards.push({ col, row }));
  return { walls, crates, shadows, shards, playerStart, exitTile, key };
}

// A tile blocks movement and sight when it is a wall or a crate.
export function isSolidTile(parsed, col, row) {
  return parsed.walls.has(parsed.key(col, row)) || parsed.crates.has(parsed.key(col, row));
}

// True when the tile at pixel (x, y) is a shadow rug.
export function isShadowTile(parsed, x, y) {
  const col = Math.floor(x / 40);
  const row = Math.floor(y / 40);
  return parsed.shadows.has(parsed.key(col, row));
}
