[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/pastikaiwayan28-cpu/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/pastikaiwayan28-cpu/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

# Lanternshade — The Ember Gallery

A quiet heist in three halls. You are Wren, a thief with a lantern, slipping
through a night gallery past patrolling wardens. Lift every ember shard, then
reach the green door — unseen.

Entry for the [make.fun best stealth game bounty](https://make.fun/c/best-stealth-game-20261121-1759)
(`best-stealth-game-20261121-1759`).

## How to play

Serve `game/` with any static server (or `node serve.ts`) and open
`game/index.html` in a desktop browser. No network request is made; every
sound is synthesized with WebAudio.

- **WASD / arrow keys** — move
- **Hold Shift** — sneak (slower, quieter, harder to spot)
- **Click** — throw a pebble to lure a warden away (3 per hall)
- **P** — pause · **M** — mute · **R** — retry after being caught

## The stealth

- Wardens patrol fixed rounds you can learn, and pause at each waypoint.
- Their **vision cones** are drawn on the floor: yellow when calm, orange
  when suspicious (`?`), red when chasing (`!`).
- Awareness rises gradually while you are seen and decays when you break
  line of sight — a near miss is recoverable.
- **Shadow rugs** hide you unless a warden is very close. Crates and walls
  block sight. Running is loud: your footstep rings can be heard.
- Collect all shards to unlock the exit, then slip out. Three halls, four
  wardens at most, one score.

## Structure

- `game/js/config.js` — tuning and palette
- `game/js/levels.js` — the three hall layouts and patrol routes
- `game/js/vision.js` — line of sight and vision-cone tests
- `game/js/audio.js` — synthesized WebAudio sounds (no audio files)
- `game/js/input.js` — keyboard and mouse
- `game/js/player.js` — the thief: movement, sneaking, pebbles, noise
- `game/js/guard.js` — warden AI: patrol, suspicion, chase, investigate
- `game/js/render.js` — canvas drawing and all screens
- `game/js/game.js` — state machine, loop, scoring
- `game/js/shots.js` — screenshot staging (`?shot=title|play|tense|win`)
- `game/js/main.js` — bootstrap

`main.ts` hands the entry in: it copies `game/` and `screenshots/` to
`/output` and writes `/output/dossier.json` with `buildDossier` from
`vendor/makefun-game.ts`.

## License

MIT — see [LICENSE](LICENSE).
