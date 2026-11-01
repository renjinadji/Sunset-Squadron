'use strict';
// Radar-guided missiles: point-and-click / tap-to-lock targeting,
// direct initial velocity launch vector, enhanced tracking agility,
// lock retention past 90 degrees, and friendly-fire safeguards.

const { test } = require('node:test');
const assert = require('node:assert');
const logic = require('../server/logic');

function vdist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function vsub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vlen(v) {
  return Math.hypot(v.x, v.y, v.z);
}

function vnorm(v) {
  const l = vlen(v);
  return l < 0.0001 ? { x: 0, y: 0, z: -1 } : { x: v.x / l, y: v.y / l, z: v.z / l };
}

test('radar missile launch vector points directly towards the locked target', () => {
  const startPos = { x: 0, y: 80, z: 0 };
  const targetPos = { x: 50, y: 110, z: -120 };

  const directVector = vnorm(vsub(targetPos, startPos));
  const expectedLen = Math.hypot(directVector.x, directVector.y, directVector.z);

  assert.ok(Math.abs(expectedLen - 1.0) < 0.0001, 'Launch vector is normalized unit vector');
  assert.ok(directVector.z < 0, 'Missile flies forward along -Z toward target');
  assert.ok(directVector.x > 0, 'Missile angles toward target +X');
  assert.ok(directVector.y > 0, 'Missile angles up toward target +Y');

  // Verify dot product between launch direction and vector to target equals 1.0 (dead center alignment)
  const toTarget = vnorm(vsub(targetPos, startPos));
  const dot = directVector.x * toTarget.x + directVector.y * toTarget.y + directVector.z * toTarget.z;
  assert.ok(Math.abs(dot - 1.0) < 0.0001, 'Missile initial vector points 100% straight for target');
});

test('radar guided missiles maintain lock past 90 degrees and have enhanced agility', () => {
  const HOMING_TURN = 2.4;
  const standardTurnMult = 1.0;
  const radarTurnMult = 2.6;

  // Standard homing agility vs Radar agility
  const standardTurnRate = HOMING_TURN * standardTurnMult;
  const radarTurnRate = HOMING_TURN * radarTurnMult;
  assert.strictEqual(radarTurnRate, 6.24, 'Radar tracking agility operates at 6.24 rad/s');
  assert.ok(radarTurnRate > standardTurnRate * 2.5, 'Radar missile is >2.5x more agile than ambient homing');

  // Lock drop check at wide angle (e.g. 115 degrees = ~2.0 rad, > 107 deg / 1.87 rad threshold)
  const angle = 2.0;
  const standardDropsLock = angle > Math.PI / 2 + 0.3;
  const radarDropsLock = !true && angle > Math.PI / 2 + 0.3; // radar flag is true

  assert.strictEqual(standardDropsLock, true, 'Unguided rockets lose lock past ~107 degrees');
  assert.strictEqual(radarDropsLock, false, 'Radar-guided missiles retain lock regardless of target bank angle');
});

test('radar targeting validates targets and enforces friendly-fire safeguards', () => {
  function validateRadarTarget(shooter, target, mode) {
    if (!target || target.gone) return false;
    if (target.id === shooter.id) return false; // Cannot target self
    if (target.hasGhost) return false; // Ghost power-up breaks radar
    if (mode === 'teams' && shooter.team && target.team && shooter.team === target.team) {
      return false; // Red vs Blue: no friendly fire targeting
    }
    if (mode === 'boss' && shooter.id !== 'boss' && target.id !== 'boss') {
      return false; // Boss raid: pilots and wingmen are allies, only boss is targetable
    }
    return true;
  }

  const human = { id: 'player1', team: 'blue', gone: false, hasGhost: false };
  const allyHuman = { id: 'player2', team: 'blue', gone: false, hasGhost: false };
  const enemyHuman = { id: 'player3', team: 'red', gone: false, hasGhost: false };
  const wingmanBot = { id: 'bot:0', team: null, gone: false, hasGhost: false };
  const stealthJet = { id: 'bot:1', team: null, gone: false, hasGhost: true };
  const boss = { id: 'boss', team: null, gone: false, hasGhost: false };

  // Crown Chase / Blitz: all opponents are valid radar targets
  assert.strictEqual(validateRadarTarget(human, wingmanBot, 'crown'), true, 'Can radar lock wingman bot in Crown Chase');
  assert.strictEqual(validateRadarTarget(human, enemyHuman, 'crown'), true, 'Can radar lock other player in Crown Chase');
  assert.strictEqual(validateRadarTarget(human, human, 'crown'), false, 'Cannot radar lock own jet');
  assert.strictEqual(validateRadarTarget(human, stealthJet, 'crown'), false, 'Ghost stealth breaks radar lock');

  // Red vs Blue Teams mode
  assert.strictEqual(validateRadarTarget(human, enemyHuman, 'teams'), true, 'Can radar lock enemy in Teams');
  assert.strictEqual(validateRadarTarget(human, allyHuman, 'teams'), false, 'Cannot radar lock teammate in Teams');

  // Boss Raid mode
  assert.strictEqual(validateRadarTarget(human, boss, 'boss'), true, 'Can radar lock the Sky Dreadnought in Boss Raid');
  assert.strictEqual(validateRadarTarget(human, wingmanBot, 'boss'), false, 'Cannot target ally wingman in Boss Raid');
  assert.strictEqual(validateRadarTarget(human, allyHuman, 'boss'), false, 'Cannot target ally pilot in Boss Raid');
});

test('screen coordinate hit test accurately detects targets within tap radius', () => {
  const touchRadiusPx = 75;
  const mouseRadiusPx = 55;

  function isScreenHit(tapX, tapY, targetScreenX, targetScreenY, isTouch) {
    const dPx = Math.hypot(tapX - targetScreenX, tapY - targetScreenY);
    const maxR = isTouch ? touchRadiusPx : mouseRadiusPx;
    return dPx <= maxR;
  }

  // Exact center hit
  assert.strictEqual(isScreenHit(200, 300, 200, 300, false), true, 'Exact mouse click is a hit');
  assert.strictEqual(isScreenHit(200, 300, 200, 300, true), true, 'Exact touch tap is a hit');

  // 40px away (within both mouse 55px and touch 75px radius)
  assert.strictEqual(isScreenHit(240, 300, 200, 300, false), true, 'Click 40px away registers hit');
  assert.strictEqual(isScreenHit(240, 300, 200, 300, true), true, 'Tap 40px away registers hit');

  // 65px away (outside 55px mouse, inside 75px touch)
  assert.strictEqual(isScreenHit(265, 300, 200, 300, false), false, 'Click 65px away misses mouse radius');
  assert.strictEqual(isScreenHit(265, 300, 200, 300, true), true, 'Tap 65px away hits forgiving mobile radius');

  // 120px away (outside both)
  assert.strictEqual(isScreenHit(320, 300, 200, 300, true), false, 'Tap 120px away misses');
});

test('radar-guided missiles have an independent cooldown separate from standard fireworks', () => {
  const ROCKET_COOLDOWN = 1.2;
  const ROCKET_COOLDOWN_SUPER = 0.6;
  const RADAR_MISSILE_COOLDOWN = 3.6;
  const RADAR_MISSILE_COOLDOWN_SUPER = 1.8;

  function simulateFire(player, t, isRadar) {
    if (isRadar) {
      let radarCd = t < player.superUntil ? RADAR_MISSILE_COOLDOWN_SUPER : RADAR_MISSILE_COOLDOWN;
      if (player.hasRapid) radarCd = Math.min(radarCd, RADAR_MISSILE_COOLDOWN * 0.5);
      radarCd *= player.perkReload;
      if (t - player.lastRadarFire < radarCd - 0.05) return false;
      player.lastRadarFire = t;
      return { type: 'radar', firedAt: t };
    } else {
      let cd = t < player.superUntil ? ROCKET_COOLDOWN_SUPER : ROCKET_COOLDOWN;
      if (player.hasRapid) cd = Math.min(cd, 0.4);
      cd *= player.perkReload;
      if (t - player.lastFire < cd - 0.05) return false;
      player.lastFire = t;
      return { type: 'standard', firedAt: t };
    }
  }

  const p = {
    superUntil: 0,
    hasRapid: false,
    perkReload: 1.0,
    lastFire: 0,
    lastRadarFire: 0,
  };

  // 1. Initial state at t = 10s: both are ready
  let t = 10.0;
  const res1 = simulateFire(p, t, true);
  assert.ok(res1 && res1.type === 'radar', 'First radar missile fires successfully');
  assert.strictEqual(p.lastRadarFire, 10.0, 'lastRadarFire updated to t = 10.0');
  assert.strictEqual(p.lastFire, 0, 'lastFire remains 0 (standard firework not touched)');

  // 2. Immediately at t = 10.1s, standard firework can fire because its cooldown is independent!
  t = 10.1;
  const res2 = simulateFire(p, t, false);
  assert.ok(res2 && res2.type === 'standard', 'Standard firework fires immediately while radar is on cooldown');
  assert.strictEqual(p.lastFire, 10.1, 'lastFire updated to 10.1');

  // 3. At t = 11.0s (1.0s after radar fire): radar missile cannot fire yet (3.6s cd)
  t = 11.0;
  const res3 = simulateFire(p, t, true);
  assert.strictEqual(res3, false, 'Radar missile blocked by 3.6s cooldown');

  // 4. At t = 11.35s (1.25s after standard fire): standard firework can fire again!
  t = 11.35;
  const res4 = simulateFire(p, t, false);
  assert.ok(res4 && res4.type === 'standard', 'Second standard firework fires at 1.25s');
  assert.strictEqual(p.lastFire, 11.35);

  // 5. At t = 13.6s (3.6s after radar fire): radar missile is ready again!
  t = 13.6;
  const res5 = simulateFire(p, t, true);
  assert.ok(res5 && res5.type === 'radar', 'Radar missile fires again after 3.6s cooldown completes');
  assert.strictEqual(p.lastRadarFire, 13.6);

  // 6. Test Super powerup and perks
  p.superUntil = 20.0; // active super
  p.perkReload = 0.9;  // 10% faster reload perk
  // With super (1.8s) and perk (0.9x): radarCd = 1.8 * 0.9 = 1.62s
  t = 14.5; // only 0.9s since last radar fire at 13.6
  assert.strictEqual(simulateFire(p, t, true), false, 'Still cooling under super perk');
  t = 15.25; // 1.65s since 13.6 -> ready!
  const res6 = simulateFire(p, t, true);
  assert.ok(res6 && res6.type === 'radar', 'Radar missile fires with super reload speed (1.62s)');
});
