// Game state machine: title, playing, paused, level clear, victory and
// caught. Owns the loop, level loading, shard pickups, the exit, scoring
// and the handoff between the player, the wardens and the renderer.
import { TILE, VIEW_W, VIEW_H } from './config.js';
import { LEVELS, parseLevelMap } from './levels.js';
import { createPlayer, updatePlayer, playerIsHidden, throwPebble } from './player.js';
import { createGuard, updateGuard, distractGuards, guardAlertLevel } from './guard.js';
import {
  drawWorld,
  drawHud,
  drawTitleScreen,
  drawPausedScreen,
  drawLevelClearScreen,
  drawVictoryScreen,
  drawCaughtScreen,
} from './render.js';
import {
  ensureAudio,
  startAmbientPad,
  playPickup,
  playLevelClear,
  playVictory,
  playCaught,
  toggleMute,
} from './audio.js';

export function createGame(canvas, input) {
  const ctx = canvas.getContext('2d');
  const game = {
    screen: 'title', // title | playing | paused | levelclear | victory | caught
    levelIndex: 0,
    level: LEVELS[0],
    parsed: null,
    player: null,
    guards: [],
    shards: [],
    exitTile: null,
    elapsed: 0,
    totalTime: 0,
    score: 0,
    timesCaught: 0,
    alertLevel: 'calm',
    time: 0,
    statusEl: document.getElementById('status'),
  };

  function loadLevel(index) {
    const level = LEVELS[index];
    const parsed = parseLevelMap(level);
    game.levelIndex = index;
    game.level = level;
    game.parsed = parsed;
    game.player = createPlayer(parsed.playerStart);
    game.guards = level.guards.map(createGuard);
    game.shards = parsed.shards.map((s) => ({ ...s, taken: false }));
    game.exitTile = parsed.exitTile;
    game.elapsed = 0;
    game.alertLevel = 'calm';
  }

  function shardsLeft() {
    return game.shards.filter((s) => !s.taken).length;
  }

  function shardsTotal() {
    return game.shards.length;
  }

  function announce(text) {
    if (game.statusEl) game.statusEl.textContent = text;
  }

  function startGame() {
    ensureAudio();
    startAmbientPad();
    game.score = 0;
    game.totalTime = 0;
    game.timesCaught = 0;
    loadLevel(0);
    game.screen = 'playing';
    announce('Level 1, The Quiet Gallery. Collect the shards, reach the green door unseen.');
  }

  function onAlarm() {
    announce('Alarm! A warden is chasing you. Break line of sight!');
  }

  function onCaught() {
    game.timesCaught += 1;
    game.screen = 'caught';
    playCaught();
    announce('Caught by a warden. Press R to try the hall again.');
  }

  function checkPickups() {
    for (const shard of game.shards) {
      if (shard.taken) continue;
      const dx = (shard.col + 0.5) * TILE - game.player.x;
      const dy = (shard.row + 0.5) * TILE - game.player.y;
      if (Math.hypot(dx, dy) < 26) {
        shard.taken = true;
        game.score += 100;
        playPickup();
        announce(`Shard taken. ${shardsLeft()} left.`);
      }
    }
  }

  function checkExit() {
    if (shardsLeft() > 0) return;
    const dx = (game.exitTile.col + 0.5) * TILE - game.player.x;
    const dy = (game.exitTile.row + 0.5) * TILE - game.player.y;
    if (Math.hypot(dx, dy) < 28) {
      game.totalTime += game.elapsed;
      const timeBonus = Math.max(0, 300 - Math.floor(game.elapsed * 2));
      game.score += 250 + timeBonus;
      if (game.levelIndex + 1 >= LEVELS.length) {
        game.screen = 'victory';
        playVictory();
        announce('You cleared every hall. Victory!');
      } else {
        game.screen = 'levelclear';
        playLevelClear();
        announce(`${game.level.name} cleared. Press Enter for the next hall.`);
      }
    }
  }

  function updatePlaying(dt) {
    game.elapsed += dt;
    updatePlayer(game.player, game.parsed, input, dt);
    const hidden = playerIsHidden(game.player, game.parsed);
    for (const guard of game.guards) {
      updateGuard(guard, game.parsed, game.player, hidden, dt, onAlarm, onCaught);
      if (game.screen !== 'playing') return;
    }
    game.alertLevel = guardAlertLevel(game.guards);
    // Running footsteps can be heard: wardens turn toward fresh rings.
    for (const ring of game.player.noiseRings) {
      if (ring.radius > 40 && !ring.heard) {
        ring.heard = true;
        for (const guard of game.guards) {
          if (Math.hypot(guard.x - ring.x, guard.y - ring.y) < 150) {
            distractGuards(game.guards, ring.x, ring.y);
            break;
          }
        }
      }
    }
    checkPickups();
    checkExit();
    const click = input.readClick();
    if (click) {
      const landing = throwPebble(game.player, click.x, click.y);
      if (landing) distractGuards(game.guards, landing.x, landing.y);
    }
  }

  function update(dt) {
    game.time += dt;
    if (input.consumePress('m')) toggleMute();
    if (game.screen === 'title') {
      if (input.consumePress('enter') || input.readClick()) startGame();
      return;
    }
    if (game.screen === 'playing') {
      if (input.consumePress('p') || input.consumePress('escape')) {
        game.screen = 'paused';
        return;
      }
      updatePlaying(dt);
      return;
    }
    if (game.screen === 'paused') {
      if (input.consumePress('p') || input.consumePress('escape') || input.consumePress('enter')) {
        game.screen = 'playing';
        input.clearPresses();
      }
      return;
    }
    if (game.screen === 'levelclear') {
      if (input.consumePress('enter') || input.readClick()) {
        loadLevel(game.levelIndex + 1);
        game.screen = 'playing';
      }
      return;
    }
    if (game.screen === 'victory' || game.screen === 'caught') {
      if (input.consumePress('r')) {
        if (game.screen === 'caught') loadLevel(game.levelIndex);
        else startGame();
        game.screen = 'playing';
      }
      return;
    }
  }

  function render() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (game.screen === 'title') {
      loadLevelPreview();
      drawWorld(ctx, worldState());
      drawTitleScreen(ctx, game.time);
      return;
    }
    drawWorld(ctx, worldState());
    if (game.screen === 'playing' || game.screen === 'paused') drawHud(ctx, hudState());
    if (game.screen === 'paused') drawPausedScreen(ctx);
    else if (game.screen === 'levelclear') drawLevelClearScreen(ctx, hudState());
    else if (game.screen === 'victory') drawVictoryScreen(ctx, victoryState());
    else if (game.screen === 'caught') drawCaughtScreen(ctx, hudState());
  }

  // The title screen shows the first hall behind the menu.
  function loadLevelPreview() {
    if (!game.parsed) loadLevel(0);
  }

  function worldState() {
    return {
      parsed: game.parsed,
      guards: game.guards,
      player: game.player,
      shards: game.shards.filter((s) => !s.taken),
      shardsLeft: shardsLeft(),
      exitTile: game.exitTile,
      time: game.time,
    };
  }

  function hudState() {
    return {
      levelIndex: game.levelIndex,
      level: game.level,
      shardsTotal: shardsTotal(),
      shardsLeft: shardsLeft(),
      elapsed: game.elapsed,
      pebbles: game.player ? game.player.pebbles : 0,
      alertLevel: game.alertLevel,
      score: game.score,
    };
  }

  function victoryState() {
    return { score: game.score, totalTime: game.totalTime, timesCaught: game.timesCaught };
  }

  let lastTime = 0;
  function frame(timestamp) {
    const dt = Math.min(0.05, (timestamp - lastTime) / 1000 || 0.016);
    lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  loadLevel(0);
  requestAnimationFrame(frame);

  // Test and screenshot hooks: the page's own code, used by shots.js.
  return {
    game,
    loadLevel,
    startGame,
    shardsLeft,
    setScreen(screen) {
      game.screen = screen;
    },
  };
}
