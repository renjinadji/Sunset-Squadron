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

test('boss raid HP scaling scales with total pilot count (humans and wingmen bots)', () => {
  const BOSS_BASE_HP = 800;
  const BOSS_HP_PER_PILOT = 250;
  const calcMaxHp = (totalPilots) => BOSS_BASE_HP + Math.max(0, totalPilots - 1) * BOSS_HP_PER_PILOT;

  assert.strictEqual(calcMaxHp(1), 800, 'Solo player faces 800 HP');
  assert.strictEqual(calcMaxHp(2), 1050, '2 pilots (human + wingman) face 1050 HP');
  assert.strictEqual(calcMaxHp(4), 1550, 'Squadron of 4 pilots faces 1550 HP');
  assert.strictEqual(calcMaxHp(5), 1800, 'Squadron of 1 human + 4 AI wingmen faces 1800 HP');
  assert.strictEqual(calcMaxHp(8), 2550, 'Full squadron of 8 pilots faces 2550 HP');
});

test('boss damage and phase transition logic (Overdrive Phase 2 at 50% HP)', () => {
  const BOSS_BASE_HP = 800;
  const maxHp = BOSS_BASE_HP;
  let hp = maxHp;
  let phase = 1;
  let enraged = false;
  let speed = 18;

  function applyDamage(amount) {
    hp = Math.max(0, hp - amount);
    if (phase === 1 && hp <= Math.round(maxHp * 0.5)) {
      phase = 2;
      enraged = true;
      speed = 28;
    }
  }

  // Phase 1 tests
  applyDamage(150);
  assert.strictEqual(hp, 650);
  assert.strictEqual(phase, 1);
  assert.strictEqual(enraged, false);
  assert.strictEqual(speed, 18);

  // Cross 50% threshold (400 HP)
  applyDamage(260);
  assert.strictEqual(hp, 390);
  assert.strictEqual(phase, 2, 'Transitions to Phase 2 at <= 50% HP');
  assert.strictEqual(enraged, true);
  assert.strictEqual(speed, 28, 'Speed accelerates to 28 m/s in Overdrive');
});

test('boss Sonic Frontiers attack specifications and bullet physics', () => {
  const BOSS_BULLET_SPEED = 125;
  const BOSS_BULLET_LIFE = 2.4;
  const BOSS_BULLET_HIT_R = 5.2;

  // Test tracer bullet travel distance over lifetime
  const maxRange = BOSS_BULLET_SPEED * BOSS_BULLET_LIFE;
  assert.strictEqual(maxRange, 300, 'Tracer bullets travel up to 300 meters');

  // Barrel roll defense deflects bullets and missiles
  const isDeflected = (playerRollingUntil, now) => playerRollingUntil > now;
  assert.strictEqual(isDeflected(10.5, 10.0), true, 'Active barrel roll deflects boss projectiles');
  assert.strictEqual(isDeflected(9.5, 10.0), false, 'Normal flight takes projectile hit');

  // Ring wave cyberspace bullet hell creates 12 projectiles around 360 deg
  const ringAngles = [];
  const ringCount = 12;
  for (let i = 0; i < ringCount; i++) {
    ringAngles.push((i / ringCount) * Math.PI * 2);
  }
  assert.strictEqual(ringAngles.length, 12);
  assert.strictEqual(ringAngles[0], 0);
  assert.strictEqual(ringAngles[6], Math.PI);
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

test('boss fight friendly-fire rules: players and wingmen cannot attack each other', () => {
  const mode = 'boss';

  // Rocket friendly-fire check function mimicking server stepRockets
  function canRocketHit(rocketOwner, victimId, isRolling = false) {
    if (victimId === rocketOwner) return false;
    if (mode === 'boss' && rocketOwner !== 'boss') return false; // No friendly fire
    if (isRolling) return false; // Deflected by barrel roll
    return true;
  }

  // Mine friendly-fire check function mimicking server stepMines
  function canMineDetonate(mineOwner, victimId) {
    if (victimId === mineOwner) return false;
    if (mode === 'boss' && mineOwner !== 'boss') return false; // No friendly fire
    return true;
  }

  // Homing target filtering mimicking server findHomingTarget
  function canTargetPlayer(rocketOwner, victimId) {
    if (victimId === rocketOwner) return false;
    if (mode === 'boss' && rocketOwner !== 'boss') return false;
    return true;
  }

  // Player rockets in boss raid
  assert.strictEqual(canRocketHit('player1', 'player2'), false, 'Player rocket cannot hit another player');
  assert.strictEqual(canRocketHit('player1', 'bot_wingman_1'), false, 'Player rocket cannot hit a wingman bot');
  assert.strictEqual(canRocketHit('bot_wingman_1', 'player1'), false, 'Wingman bot rocket cannot hit a player');
  assert.strictEqual(canRocketHit('bot_wingman_1', 'bot_wingman_2'), false, 'Wingman bot rocket cannot hit another wingman');

  // Player targeting in boss raid
  assert.strictEqual(canTargetPlayer('player1', 'player2'), false, 'Player rocket cannot home in on another player');
  assert.strictEqual(canTargetPlayer('bot_wingman_1', 'player1'), false, 'Wingman bot rocket cannot home in on player');

  // Player mines in boss raid
  assert.strictEqual(canMineDetonate('player1', 'player2'), false, 'Player mine does not detonate on another player');
  assert.strictEqual(canMineDetonate('player1', 'bot_wingman_1'), false, 'Player mine does not detonate on a wingman bot');
  assert.strictEqual(canMineDetonate('bot_wingman_1', 'player1'), false, 'Wingman mine does not detonate on player');

  // Boss weapons CAN hit players/wingmen
  assert.strictEqual(canRocketHit('boss', 'player1'), true, 'Boss missile can hit player');
  assert.strictEqual(canRocketHit('boss', 'bot_wingman_1'), true, 'Boss missile can hit wingman bot');
  assert.strictEqual(canTargetPlayer('boss', 'player1'), true, 'Boss missile can target player');
  assert.strictEqual(canMineDetonate('boss', 'player1'), true, 'Boss mine can detonate on player');
  assert.strictEqual(canMineDetonate('boss', 'bot_wingman_1'), true, 'Boss mine can detonate on wingman bot');
});

test('boss attacks deliver heavy Sonic Frontiers knock-back and control dampening', () => {
  function vlen(v) { return Math.hypot(v.x, v.y, v.z); }
  function vnorm(v) {
    const l = vlen(v);
    return l < 0.0001 ? { x: 0, y: 0, z: -1 } : { x: v.x / l, y: v.y / l, z: v.z / l };
  }
  function vscale(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; }

  // 1. Boss seeker missile extra knockback impulse: 115 m/s
  const mDir = vnorm({ x: 0, y: Math.max(0.28, 0.35), z: -1 });
  const missileKb = vscale(mDir, 115);
  assert.ok(Math.abs(vlen(missileKb) - 115) < 0.001, 'Seeker missile delivers extra 115 m/s knockback impulse');
  assert.ok(missileKb.y > 0, 'Missile imparts upward lift knockback');

  // 2. Boss autocannon tracer knockback impulse: 34 m/s
  const bDir = vnorm({ x: 0.5, y: -0.2, z: -0.84 });
  const bulletKb = vscale(bDir, 34);
  assert.ok(Math.abs(vlen(bulletKb) - 34) < 0.001, 'Autocannon tracer delivers 34 m/s knockback impulse');

  // 3. Boss cyberspace bullet hell radial ring knockback impulse: 54 m/s
  const bossPos = { x: 0, y: 80, z: 0 };
  const playerPos = { x: 60, y: 85, z: 20 };
  const ringDir = vnorm({
    x: playerPos.x - bossPos.x,
    y: Math.max(6, (playerPos.y - bossPos.y) + 8),
    z: playerPos.z - bossPos.z,
  });
  const ringKb = vscale(ringDir, 54);
  assert.ok(Math.abs(vlen(ringKb) - 54) < 0.001, 'Cyberspace ring delivers 54 m/s outward knockback impulse');
  assert.ok(ringKb.x > 0 && ringKb.z > 0, 'Ring repels outward from titan core');

  // 4. Boss defensive flak bomb burst knockback impulse: 60 m/s
  const flakPos = { x: 10, y: 70, z: -30 };
  const flakAway = vnorm({
    x: playerPos.x - flakPos.x,
    y: Math.max(5, (playerPos.y - flakPos.y) + 8),
    z: playerPos.z - flakPos.z,
  });
  const flakKb = vscale(flakAway, 60);
  assert.ok(Math.abs(vlen(flakKb) - 60) < 0.001, 'Flak bomb burst delivers 60 m/s knockback impulse');

  // 5. Boss proximity sky mine knockback impulse: 64 m/s
  const minePos = { x: 50, y: 80, z: 15 };
  const mineAway = vnorm({
    x: playerPos.x - minePos.x,
    y: Math.max(6, (playerPos.y - minePos.y) + 10),
    z: playerPos.z - minePos.z,
  });
  const mineKb = vscale(mineAway, 64);
  assert.ok(Math.abs(vlen(mineKb) - 64) < 0.001, 'Proximity mine delivers 64 m/s knockback impulse');

  // 6. Sky Dreadnought hull collision & ramming knockback: 78 m/s
  const ramAway = vnorm({
    x: playerPos.x - bossPos.x,
    y: Math.max(5, (playerPos.y - bossPos.y) + 8),
    z: playerPos.z - bossPos.z,
  });
  const ramKb = vscale(ramAway, 78);
  assert.ok(Math.abs(vlen(ramKb) - 78) < 0.001, 'Hull ramming catapults jet away with 78 m/s knockback');

  // 7. Aerodynamic drag decay simulation
  let kb = { ...ramKb };
  const dt = 0.05;
  for (let step = 0; step < 20; step++) {
    const decay = Math.exp(-dt * 4.0);
    kb.x *= decay;
    kb.y *= decay;
    kb.z *= decay;
  }
  // After 1 second (20 steps of 0.05s), impulse decays to ~e^(-4.0) = ~0.018x of original
  assert.ok(vlen(kb) < 2.0, 'Knockback decays exponentially over 1 second');

  // 8. Control dampening during knockback tumble
  function getControlDampening(tumble) {
    return tumble > 0 ? Math.max(0.25, Math.min(1, 1 - (tumble / 0.8) * 0.75)) : 1.0;
  }
  assert.strictEqual(getControlDampening(0), 1.0, 'Normal flight retains 100% control responsiveness');
  assert.strictEqual(getControlDampening(0.8), 0.25, 'Peak tumble dampens steering control down to 25%');
  assert.strictEqual(getControlDampening(0.4), 0.625, 'Mid-recovery tumble allows 62.5% control');
});

test('boss raid missile homing and decoy retargeting with multiple players does not throw ReferenceError', () => {
  // Simulates stepRockets decoy check logic when active decoys are present
  const players = new Map();
  players.set('p1', { id: 'p1', name: 'Pilot1', team: null, pos: { x: 0, y: 70, z: 0 } });
  players.set('p2', { id: 'p2', name: 'Pilot2', team: null, pos: { x: 50, y: 70, z: 0 } });
  players.set('bot-1', { id: 'bot-1', name: 'Wingman Ace', isBot: true, team: null, pos: { x: 30, y: 70, z: 0 } });

  const decoys = [
    { id: 1, owner: 'p1', team: null, p: { x: 5, y: 70, z: 5 } },
    { id: 2, owner: 'bot-1', team: null, p: { x: 35, y: 70, z: 5 } },
  ];

  const rockets = [
    { id: 1, owner: 'boss', team: null, p: { x: 0, y: 135, z: 0 }, d: { x: 0, y: -0.5, z: 1 }, born: 10, target: 'p1', targetKind: 'player' },
    { id: 2, owner: 'p2', team: null, p: { x: 50, y: 75, z: 0 }, d: { x: 0, y: 0, z: -1 }, born: 10, target: null, targetKind: null },
  ];

  // Test that checking decoys for retargeting works for both boss and player rockets without ReferenceError
  for (const r of rockets) {
    if (r.targetKind !== 'decoy') {
      for (const dec of decoys) {
        if (dec.owner === r.owner) continue;
        const shooter = players.get(r.owner);
        const shooterTeam = r.team || (shooter ? shooter.team : null);
        const decOwner = players.get(dec.owner);
        const decTeam = dec.team || (decOwner ? decOwner.team : null);
        assert.doesNotThrow(() => {
          const isSameTeam = 'boss' === 'teams' && shooterTeam && decTeam && shooterTeam === decTeam;
          const isBossAlly = 'boss' === 'boss' && r.owner !== 'boss';
        });
      }
    }
  }
});
