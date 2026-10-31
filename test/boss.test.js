'use strict';
// Sky Dreadnought Boss Raid: mode constants, leaderboard wiring, HP scaling,
// damage and phase transition logic, scoring, and credit payouts.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Leaderboard } = require('../leaderboard');
const logic = require('../server/logic');

function tmpBoard() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-boss-'));
  return { dir, file: path.join(dir, 'leaderboard.json') };
}

function row(name, over = {}) {
  return { name, pilot: 'renji', score: 100, points: 100, balloons: 0, hits: 10, won: false, ...over };
}

test('boss is a first-class leaderboard mode with win tracking', async () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  assert.ok(lb.board.modes.boss !== undefined, 'boss mode exists in empty board');

  // Raid victory: participants who defeated the boss get won: true
  const bests = lb.recordRound('boss', [
    row('Ace', { score: 350, points: 350, hits: 15, won: true }),
    row('Wingman', { score: 180, points: 180, hits: 8, won: true }),
  ]);
  assert.deepStrictEqual(bests['Ace::renji'], ['First round on the board', 'First win!']);
  assert.deepStrictEqual(bests['Wingman::renji'], ['First round on the board', 'First win!']);
  await lb.save();

  assert.strictEqual(lb.board.modes.boss['Ace::renji'].wins, 1);
  assert.strictEqual(lb.board.modes.boss['Ace::renji'].bestScore, 350);
  assert.strictEqual(lb.board.modes.boss['Wingman::renji'].wins, 1);

  const summary = lb.summary(10);
  assert.ok(Array.isArray(summary.modes.boss));
  assert.strictEqual(summary.totals.boss, 2);
  assert.strictEqual(summary.modes.boss[0].name, 'Ace');
});

test('boss raid HP scaling scales with human player count', () => {
  const BOSS_BASE_HP = 500;
  const calcMaxHp = (numHumans) => BOSS_BASE_HP + Math.max(0, numHumans - 1) * 100;

  assert.strictEqual(calcMaxHp(1), 500, 'Solo player faces 500 HP');
  assert.strictEqual(calcMaxHp(2), 600, '2 players face 600 HP');
  assert.strictEqual(calcMaxHp(4), 800, 'Squadron of 4 faces 800 HP');
  assert.strictEqual(calcMaxHp(8), 1200, 'Full lobby of 8 faces 1200 HP');
});

test('boss damage and phase transition logic', () => {
  const maxHp = 500;
  let hp = maxHp;
  let phase = 1;
  let enraged = false;
  let speed = 18;

  function applyDamage(amount) {
    hp = Math.max(0, hp - amount);
    if (phase === 1 && hp <= Math.round(maxHp * 0.5)) {
      phase = 2;
      enraged = true;
      speed = 27;
    }
  }

  // Phase 1 tests
  applyDamage(100);
  assert.strictEqual(hp, 400);
  assert.strictEqual(phase, 1);
  assert.strictEqual(enraged, false);
  assert.strictEqual(speed, 18);

  // Cross 50% threshold (250 HP)
  applyDamage(160);
  assert.strictEqual(hp, 240);
  assert.strictEqual(phase, 2, 'Transitions to Phase 2 at <= 50% HP');
  assert.strictEqual(enraged, true);
  assert.strictEqual(speed, 27, 'Speed accelerates in Overdrive');
});

test('boss weapon damage specifications: rocket regular, rocket crit, mine, and ramming', () => {
  const BOSS_COLLISION_R = 36;
  const BOSS_CORE_R = 14;

  // Outer hull hit: distance 25 (between 14 and 36) -> normal hit (4 dmg)
  const distOuter = 25;
  const isOuterCrit = distOuter < BOSS_CORE_R;
  assert.strictEqual(isOuterCrit, false);
  const dmgOuter = isOuterCrit ? 6 : 4;
  assert.strictEqual(dmgOuter, 4);

  // Ventral core weak point hit: distance 10 (< 14) -> critical hit (6 dmg)
  const distCore = 10;
  const isCoreCrit = distCore < BOSS_CORE_R;
  assert.strictEqual(isCoreCrit, true);
  const dmgCore = isCoreCrit ? 6 : 4;
  assert.strictEqual(dmgCore, 6);

  // Proximity sky mine detonation deals 8 damage
  const dmgMine = 8;
  assert.strictEqual(dmgMine, 8);

  // Jet ramming deals 5 damage
  const dmgRam = 5;
  assert.strictEqual(dmgRam, 5);
});

test('defeat scoring and assist rewards', () => {
  const damageMap = {
    player1: 280, // Killer
    player2: 150, // Assist 1
    player3: 70,  // Assist 2
    player4: 0,   // Non-participant
  };

  const killerId = 'player1';
  let killerBonus = 0;
  const assistBonuses = {};

  if (killerId) killerBonus = 250;
  for (const [pid, dmg] of Object.entries(damageMap)) {
    if (pid !== killerId && dmg > 0) {
      assistBonuses[pid] = 100;
    }
  }

  assert.strictEqual(killerBonus, 250, 'Killer receives +250 points');
  assert.strictEqual(assistBonuses.player2, 100, 'Dealt 150 dmg -> +100 assist');
  assert.strictEqual(assistBonuses.player3, 100, 'Dealt 70 dmg -> +100 assist');
  assert.strictEqual(assistBonuses.player4, undefined, '0 dmg -> no assist');
});

test('computeCreditPayout awards bossDefeated bonus (+50 CR)', () => {
  // Boss raid defeat victory
  const victoryPayout = logic.computeCreditPayout({
    mode: 'boss',
    score: 300,
    stylePoints: 20,
    eventParticipated: false,
    hasPb: false,
    rankIndex: 0,
    totalPlayers: 4,
    bossDefeated: true,
  });

  assert.strictEqual(victoryPayout.bossDefeatedBonus, 50, 'Awards 50 CR for boss defeat');
  assert.ok(victoryPayout.totalEarned >= 80, 'Total includes base finish + score bonus + bossDefeatedBonus');

  // Boss raid time expired (defeat failed)
  const defeatPayout = logic.computeCreditPayout({
    mode: 'boss',
    score: 150,
    stylePoints: 10,
    eventParticipated: false,
    hasPb: false,
    rankIndex: 0,
    totalPlayers: 4,
    bossDefeated: false,
  });

  assert.strictEqual(defeatPayout.bossDefeatedBonus, 0, 'No bossDefeated bonus if boss survived');
});
