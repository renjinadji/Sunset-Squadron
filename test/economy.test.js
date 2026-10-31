'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const shop = require('../shared/shop');
const { Leaderboard } = require('../leaderboard');
const { computeCreditPayout, generateEvent } = require('../server/logic');

function tempBoard() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-econ-'));
  return { dir, file: path.join(dir, 'leaderboard.json') };
}

test('random bot equipped loadouts span all 6 categories with valid shop items', () => {
  for (let trial = 0; trial < 10; trial++) {
    const eq = {};
    for (const cat of shop.SHOP_CATEGORIES) {
      const list = shop.itemsByCategory(cat);
      assert.ok(list.length > 0);
      eq[cat] = list[Math.floor(Math.random() * list.length)].id;
    }
    for (const cat of shop.SHOP_CATEGORIES) {
      assert.ok(eq[cat], `category ${cat} is present`);
      const item = shop.itemById(eq[cat]);
      assert.ok(item, `item ${eq[cat]} is a valid catalog item`);
      assert.strictEqual(item.category, cat);
    }
  }
});

test('round sponsors: catalog contains the 3 required communal modifiers', () => {
  const doubleEv = shop.sponsorById('sponsor_double_event');
  assert.ok(doubleEv);
  assert.strictEqual(doubleEv.effect, 'double_event');
  assert.strictEqual(doubleEv.cost, 150);

  const crateRain = shop.sponsorById('sponsor_crate_rain');
  assert.ok(crateRain);
  assert.strictEqual(crateRain.effect, 'crate_rain');
  assert.strictEqual(crateRain.cost, 150);

  const goldenSkies = shop.sponsorById('sponsor_golden_skies');
  assert.ok(goldenSkies);
  assert.strictEqual(goldenSkies.effect, 'golden_skies');
  assert.strictEqual(goldenSkies.cost, 100);
});

test('double event scheduling: generates two sequential events at 1/3 and 2/3 round', () => {
  const roundSeconds = 180;
  const seed = 42;
  const ev1 = generateEvent(seed, roundSeconds);
  ev1.atS = Math.round(roundSeconds / 3);
  ev1.durS = Math.min(ev1.durS, Math.max(8, Math.round(roundSeconds / 3) - 6));

  const ev2 = generateEvent(seed ^ 0xa5a5a5a5, roundSeconds);
  ev2.atS = Math.round((roundSeconds * 2) / 3);
  ev2.durS = Math.min(ev2.durS, Math.max(8, Math.round(roundSeconds / 3) - 6));

  assert.strictEqual(ev1.atS, 60);
  assert.strictEqual(ev2.atS, 120);
  assert.ok(ev1.atS + ev1.durS <= ev2.atS, 'first event ends before second starts');
  assert.ok(ev2.atS + ev2.durS <= roundSeconds, 'second event ends before round ends');
});

test('payout calculation: full breakdown verification with all bonuses active', () => {
  const breakdown = computeCreditPayout({
    mode: 'crown',
    score: 200,
    stylePoints: 40,
    eventParticipated: true,
    hasPb: true,
    rankIndex: 3,
    totalPlayers: 4,
    sponsorId: 'sponsor_golden_skies',
  });

  assert.strictEqual(breakdown.baseFinish, 50);
  assert.strictEqual(breakdown.scoreBonus, 200);
  assert.strictEqual(breakdown.styleBonus, 60);     // floor(40 * 1.5) = 60
  assert.strictEqual(breakdown.eventBonus, 40);     // +40
  assert.strictEqual(breakdown.pbBonus, 75);        // +75
  assert.strictEqual(breakdown.underdogBonus, 25);  // +25 (index 3 of 4 is bottom half)
  assert.strictEqual(breakdown.sponsorMultiplier, 1.25);
  // Subtotal = 50 + 200 + 60 + 40 + 75 + 25 = 450
  // Total = 450 * 1.25 = 562.5 -> 563
  assert.strictEqual(breakdown.totalEarned, 563);
});

test('payout calculation: capped score bonus in blitz and teams', () => {
  const blitzCapped = computeCreditPayout({
    mode: 'blitz',
    score: 1000,
    stylePoints: 0,
    totalPlayers: 2,
    rankIndex: 0,
  });
  assert.strictEqual(blitzCapped.scoreBonus, 250, 'blitz 1000 * 0.5 = 500 capped at 250');

  const teamsCapped = computeCreditPayout({
    mode: 'teams',
    score: 800,
    stylePoints: 0,
    totalPlayers: 2,
    rankIndex: 0,
  });
  assert.strictEqual(teamsCapped.scoreBonus, 250, 'teams 800 * 0.5 = 400 capped at 250');
});

test('wallet persistence integration with credit payouts and sponsor spending', () => {
  const { file } = tempBoard();
  const lb = new Leaderboard(file);

  // Initialize wallet for pilot
  const w = lb.getOrCreateWallet('Maverick');
  assert.strictEqual(w.credits, 0);

  // Award round payout
  const payout = computeCreditPayout({
    mode: 'crown',
    score: 150,
    stylePoints: 10,
    eventParticipated: true,
    totalPlayers: 2,
    rankIndex: 0,
  });
  // base (50) + score (150) + style (15) + event (40) = 255
  assert.strictEqual(payout.totalEarned, 255);

  const updated = lb.awardCredits('Maverick', payout.totalEarned);
  assert.strictEqual(updated.credits, 255);
  assert.strictEqual(updated.lifetimeCredits, 255);

  // Purchase a sponsor
  const sponsorRes = lb.spendCreditsForSponsor('Maverick', 'sponsor_golden_skies');
  assert.strictEqual(sponsorRes.ok, true);
  assert.strictEqual(sponsorRes.wallet.credits, 155); // 255 - 100

  // Purchase a cosmetic item
  const buyRes = lb.purchaseItem('Maverick', 'fw_saturn'); // cost 300
  assert.strictEqual(buyRes.ok, false, 'insufficient credits (155 < 300)');

  // Award another 200 credits
  lb.awardCredits('Maverick', 200);
  const buyRes2 = lb.purchaseItem('Maverick', 'fw_saturn');
  assert.strictEqual(buyRes2.ok, true);
  assert.strictEqual(buyRes2.wallet.credits, 55); // 355 - 300 = 55
  assert.strictEqual(buyRes2.wallet.equipped.firework, 'fw_saturn');
});
