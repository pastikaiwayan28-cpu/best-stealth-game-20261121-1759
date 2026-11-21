// Canvas drawing: the gallery floor, walls and cover, glowing vision
// cones, the thief, the wardens, and every screen of the game. Nothing
// here loads an image or a font from the network; every shape is drawn.
import {
  COLS,
  ROWS,
  TILE,
  VIEW_W,
  VIEW_H,
  PALETTE,
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  SUSPICIOUS_AT,
  ALARM_AT,
} from './config.js';
import { coneRayLength } from './vision.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, parsed) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = PALETTE.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
  // Shadow rugs: dark pools where the thief can hide.
  for (const key of parsed.shadows) {
    const [col, row] = key.split(',').map(Number);
    const x = col * TILE;
    const y = row * TILE;
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    ctx.strokeStyle = PALETTE.shadowEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
  }
}

function drawWallsAndCrates(ctx, parsed) {
  for (const key of parsed.walls) {
    const [col, row] = key.split(',').map(Number);
    const x = col * TILE;
    const y = row * TILE;
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(x, y, TILE, 7);
    ctx.strokeStyle = PALETTE.wallEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
  }
  for (const key of parsed.crates) {
    const [col, row] = key.split(',').map(Number);
    const x = col * TILE + 4;
    const y = row * TILE + 4;
    ctx.fillStyle = PALETTE.crate;
    roundRect(ctx, x, y, TILE - 8, TILE - 8, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.crateTop;
    roundRect(ctx, x, y, TILE - 8, 10, 5);
    ctx.fill();
    ctx.strokeStyle = PALETTE.crateEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + TILE - 12, y + TILE - 12);
    ctx.moveTo(x + TILE - 12, y + 4);
    ctx.lineTo(x + 4, y + TILE - 12);
    ctx.stroke();
  }
}

function drawExit(ctx, exitTile, shardsLeft, time) {
  const cx = (exitTile.col + 0.5) * TILE;
  const cy = (exitTile.row + 0.5) * TILE;
  const pulse = 0.6 + 0.4 * Math.sin(time * 3);
  const open = shardsLeft === 0;
  ctx.save();
  ctx.globalAlpha = open ? 0.95 : 0.45;
  ctx.fillStyle = PALETTE.exit;
  ctx.shadowColor = PALETTE.exit;
  ctx.shadowBlur = open ? 26 * pulse : 8;
  roundRect(ctx, cx - 17, cy - 17, 34, 34, 7);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#06281a';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'OUT' : 'LOCK', cx, cy + 1);
  if (!open) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '11px Georgia, serif';
    ctx.fillText(shardsLeft + ' shard' + (shardsLeft === 1 ? '' : 's') + ' left', cx, cy + 28);
  }
}

function drawShard(ctx, shard, time) {
  const bob = Math.sin(time * 2.5 + shard.col) * 3;
  const cx = (shard.col + 0.5) * TILE;
  const cy = (shard.row + 0.5) * TILE + bob;
  ctx.save();
  ctx.shadowColor = PALETTE.shardGlow;
  ctx.shadowBlur = 16;
  ctx.fillStyle = PALETTE.shard;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 11);
  ctx.lineTo(cx + 8, cy);
  ctx.lineTo(cx, cy + 11);
  ctx.lineTo(cx - 8, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff3d6';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx + 3, cy);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx - 3, cy);
  ctx.closePath();
  ctx.fill();
}

function drawVisionCone(ctx, parsed, guard) {
  const color = guard.state === 'chase'
    ? PALETTE.coneAlarm
    : guard.awareness >= SUSPICIOUS_AT
      ? PALETTE.coneSuspicious
      : PALETTE.coneCalm;
  const steps = 26;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= steps; i += 1) {
    const angle = guard.facing - GUARD_VIEW_HALF_ANGLE
      + (2 * GUARD_VIEW_HALF_ANGLE * i) / steps;
    const len = coneRayLength(parsed, guard, angle);
    ctx.lineTo(guard.x + Math.cos(angle) * len, guard.y + Math.sin(angle) * len);
  }
  ctx.closePath();
  ctx.fill();
}

function drawGuard(ctx, guard, time) {
  const bob = guard.state === 'patrol' ? Math.sin(time * 6 + guard.x) * 1.5 : 0;
  ctx.save();
  ctx.translate(guard.x, guard.y + bob);
  // Body: a warden in a crimson coat, lantern in hand.
  ctx.fillStyle = guard.state === 'chase' ? '#ff2e2e' : PALETTE.guard;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#2a0505';
  ctx.stroke();
  // Facing wedge: a pale visor showing where the warden looks.
  ctx.rotate(guard.facing);
  ctx.fillStyle = '#ffe9c4';
  ctx.beginPath();
  ctx.moveTo(4, -6);
  ctx.lineTo(16, 0);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Awareness arc above the warden's head.
  if (guard.awareness > 2) {
    const frac = guard.awareness / ALARM_AT;
    ctx.strokeStyle = frac >= 1 ? '#ff2e2e' : frac >= SUSPICIOUS_AT / ALARM_AT ? '#ff9a2e' : '#ffd65a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 22, 9, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.state === 'chase' ? '!' : guard.awareness >= SUSPICIOUS_AT ? '?' : '', guard.x, guard.y - 30);
  }
}

function drawPlayer(ctx, player, time) {
  const bob = player.moving ? Math.sin(time * 10) * 1.5 : Math.sin(time * 2) * 1;
  ctx.save();
  ctx.translate(player.x, player.y + bob);
  // Lantern glow around the thief.
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
  glow.addColorStop(0, 'rgba(255, 176, 46, 0.28)');
  glow.addColorStop(1, 'rgba(255, 176, 46, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  // Hooded figure in teal.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.playerDark;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.rotate(player.facing);
  ctx.fillStyle = '#0b2b26';
  ctx.beginPath();
  ctx.moveTo(3, -6);
  ctx.lineTo(15, 0);
  ctx.lineTo(3, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (player.sneaking) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', player.x, player.y - 22);
  }
}

function drawNoiseRings(ctx, player) {
  for (const ring of player.noiseRings) {
    ctx.strokeStyle = `rgba(244, 227, 178, ${0.5 * (1 - ring.radius / ring.max)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawWorld(ctx, state) {
  const { parsed, guards, player, shardsLeft, time } = state;
  drawFloor(ctx, parsed);
  drawExit(ctx, state.exitTile, shardsLeft, time);
  for (const shard of state.shards) drawShard(ctx, shard, time);
  drawWallsAndCrates(ctx, parsed);
  for (const guard of guards) drawVisionCone(ctx, parsed, guard);
  drawNoiseRings(ctx, player);
  for (const guard of guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, player, time);
}

export function drawHud(ctx, state) {
  const { levelIndex, level, shardsTotal, shardsLeft, elapsed, pebbles, alertLevel, score } = state;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 15, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Level ${levelIndex + 1} — ${level.name}`, 12, 18);
  ctx.textAlign = 'center';
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60).toString().padStart(2, '0');
  ctx.fillText(`Shards ${shardsTotal - shardsLeft}/${shardsTotal}   ${mins}:${secs}   Pebbles ${pebbles}`, VIEW_W / 2, 18);
  ctx.textAlign = 'right';
  ctx.fillStyle = alertLevel === 'alarm' ? PALETTE.danger : alertLevel === 'suspicious' ? '#ff9a2e' : PALETTE.textDim;
  ctx.fillText(alertLevel === 'alarm' ? 'ALARM!' : alertLevel === 'suspicious' ? 'SUSPICIOUS' : 'UNSEEN', VIEW_W - 12, 18);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${score}`, 12, VIEW_H - 12);
  ctx.textAlign = 'right';
  ctx.fillText('WASD move · Shift sneak · Click throw pebble · P pause · M mute', VIEW_W - 12, VIEW_H - 12);
  ctx.restore();
}

function dimScreen(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 6, 14, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function centeredText(ctx, lines) {
  let y = 150;
  for (const line of lines) {
    ctx.fillStyle = line.color || PALETTE.text;
    ctx.font = line.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(line.text, VIEW_W / 2, y);
    y += line.gap || 34;
  }
}

export function drawTitleScreen(ctx, time) {
  dimScreen(ctx, 0.82);
  // A row of painted lanterns swaying above the title.
  for (let i = 0; i < 7; i += 1) {
    const x = 120 + i * 120;
    const sway = Math.sin(time * 1.4 + i) * 5;
    ctx.strokeStyle = '#3a4468';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + sway, 52);
    ctx.stroke();
    ctx.fillStyle = i % 2 === 0 ? PALETTE.shard : PALETTE.exit;
    ctx.beginPath();
    ctx.moveTo(x + sway, 52);
    ctx.lineTo(x + sway + 9, 64);
    ctx.lineTo(x + sway, 76);
    ctx.lineTo(x + sway - 9, 64);
    ctx.closePath();
    ctx.fill();
  }
  centeredText(ctx, [
    { text: 'LANTERNSHADE', font: 'bold 64px Georgia, serif', color: '#ffd65a', gap: 66 },
    { text: 'The Ember Gallery', font: 'italic 26px Georgia, serif', color: PALETTE.text, gap: 44 },
    { text: 'A quiet heist in three halls. Lift every ember shard,', font: '18px Georgia, serif', color: PALETTE.textDim, gap: 26 },
    { text: 'then slip out the green door — unseen.', font: '18px Georgia, serif', color: PALETTE.textDim, gap: 40 },
    { text: 'WASD / arrows to move · hold Shift to sneak · click to throw a pebble', font: '16px Georgia, serif', gap: 28 },
    { text: 'Hide in shadow rugs · running is loud · a ? means a warden is suspicious', font: '16px Georgia, serif', gap: 52 },
    { text: 'Press Enter or click to begin', font: 'bold 20px Georgia, serif', color: '#7de3a8' },
  ]);
}

export function drawPausedScreen(ctx) {
  dimScreen(ctx, 0.66);
  centeredText(ctx, [
    { text: 'Paused', font: 'bold 44px Georgia, serif', gap: 44 },
    { text: 'Press P to keep sneaking', font: '18px Georgia, serif', color: PALETTE.textDim },
  ]);
}

export function drawLevelClearScreen(ctx, state) {
  dimScreen(ctx, 0.72);
  centeredText(ctx, [
    { text: 'Hall Cleared', font: 'bold 48px Georgia, serif', color: '#7de3a8', gap: 52 },
    { text: `${state.level.name} — all shards lifted, out the door unseen.`, font: '19px Georgia, serif', gap: 34 },
    { text: `Score ${state.score} · Time ${Math.floor(state.elapsed / 60)}:${Math.floor(state.elapsed % 60).toString().padStart(2, '0')}`, font: '18px Georgia, serif', color: PALETTE.textDim, gap: 52 },
    { text: 'Press Enter for the next hall', font: 'bold 20px Georgia, serif' },
  ]);
}

export function drawVictoryScreen(ctx, state) {
  dimScreen(ctx, 0.82);
  centeredText(ctx, [
    { text: 'THE LAST LANTERN LIT', font: 'bold 44px Georgia, serif', color: '#ffd65a', gap: 56 },
    { text: 'Every shard is yours. The gallery never knew you were there.', font: '20px Georgia, serif', gap: 36 },
    { text: `Final score ${state.score} · Total time ${Math.floor(state.totalTime / 60)}:${Math.floor(state.totalTime % 60).toString().padStart(2, '0')} · Never caught: ${state.timesCaught === 0 ? 'yes' : 'no'}`, font: '18px Georgia, serif', color: PALETTE.textDim, gap: 50 },
    { text: 'Press R to steal again', font: 'bold 20px Georgia, serif', color: '#7de3a8' },
  ]);
}

export function drawCaughtScreen(ctx, state) {
  dimScreen(ctx, 0.78);
  centeredText(ctx, [
    { text: 'CAUGHT', font: 'bold 56px Georgia, serif', color: PALETTE.danger, gap: 52 },
    { text: 'A warden laid a hand on your shoulder in the dark.', font: '20px Georgia, serif', gap: 36 },
    { text: `${state.level.name} · Shards ${state.shardsTotal - state.shardsLeft}/${state.shardsTotal}`, font: '18px Georgia, serif', color: PALETTE.textDim, gap: 50 },
    { text: 'Press R to try the hall again', font: 'bold 20px Georgia, serif' },
  ]);
}
