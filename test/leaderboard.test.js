'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Leaderboard } = require('../leaderboard');

function tmpBoard() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-board-'));
  return { dir, file: path.join(dir, 'leaderboard.json') };
}

function row(name, over = {}) {
  return { name, pilot: 'renji', score: 10, points: 10, balloons: 0, hits: 0, won: false, ...over };
}

test('constructor creates the file and an empty board shape', () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  assert.ok(fs.existsSync(file));
  assert.deepStrictEqual(lb.board.modes, { crown: {}, blitz: {}, race: {}, teams: {}, boss: {} });
  const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(onDisk.version, 1);
  assert.ok(onDisk.modes);
});

test('recordRound updates wins/rounds/bestScore/totalPoints/balloons/hits', async () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  let bests = lb.recordRound('crown', [row('Ace', { score: 50, points: 7, balloons: 3, hits: 2, won: true })]);
  assert.deepStrictEqual(bests['Ace::renji'], ['First round on the board', 'First win!']);
  bests = lb.recordRound('crown', [row('Ace', { score: 30, points: 4, balloons: 1, hits: 5 })]);
  assert.deepStrictEqual(bests['Ace::renji'], []);
  bests = lb.recordRound('crown', [row('Ace', { score: 80, points: 2, balloons: 0, hits: 1 })]);
  assert.deepStrictEqual(bests['Ace::renji'], ['New best score (80, was 50)']);
  await lb.save();
  const e = lb.board.modes.crown['Ace::renji'];
  assert.strictEqual(e.wins, 1);
  assert.strictEqual(e.rounds, 3);
  assert.strictEqual(e.bestScore, 80);
  assert.strictEqual(e.totalPoints, 13);   // 7 + 4 + 2
  assert.strictEqual(e.balloons, 4);
  assert.strictEqual(e.hits, 8);
  assert.ok(e.lastPlayed);
  // Second win does not re-award the first-win badge.
  bests = lb.recordRound('crown', [row('Ace', { score: 90, won: true })]);
  assert.deepStrictEqual(bests['Ace::renji'], ['New best score (90, was 80)']);
  await lb.save();
  assert.strictEqual(lb.board.modes.crown['Ace::renji'].wins, 2);
  assert.strictEqual(lb.board.modes.crown['Ace::renji'].rounds, 4);
});

test('recordRound: scores are clamped to >= 0 and rounded', async () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  lb.recordRound('blitz', [row('Bex', { score: -7.6 })]);
  await lb.save();
  assert.strictEqual(lb.board.modes.blitz['Bex::renji'].bestScore, 0);
  lb.recordRound('blitz', [row('Bex', { score: 12.4 })]);
  await lb.save();
  assert.strictEqual(lb.board.modes.blitz['Bex::renji'].bestScore, 12);
});

test('recordRound: unknown mode is a no-op returning no bests', () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  const bests = lb.recordRound('nonsense', [row('Cid')]);
  assert.deepStrictEqual(bests, {});
  assert.deepStrictEqual(lb.board.modes.crown, {});
});

test('per-(player, pilot) keying and mode isolation', async () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  lb.recordRound('crown', [row('Dee', { pilot: 'renji', score: 10 }), row('Dee', { pilot: 'resa', score: 20 })]);
  lb.recordRound('race', [row('Dee', { pilot: 'renji', score: 30 })]);
  await lb.save();
  assert.strictEqual(lb.board.modes.crown['Dee::renji'].bestScore, 10);
  assert.strictEqual(lb.board.modes.crown['Dee::resa'].bestScore, 20);
  assert.strictEqual(lb.board.modes.race['Dee::renji'].bestScore, 30);
  assert.strictEqual(Object.keys(lb.board.modes.blitz).length, 0);
});

test('persistence: a new instance over the same file reloads recorded entries', async () => {
  const { file } = tmpBoard();
  const first = new Leaderboard(file);
  first.recordRound('crown', [row('Eve', { score: 42, won: true, balloons: 2, hits: 3 })]);
  await first.save();
  const second = new Leaderboard(file);
  const e = second.board.modes.crown['Eve::renji'];
  assert.ok(e, 'entry reloaded from disk');
  assert.strictEqual(e.wins, 1);
  assert.strictEqual(e.bestScore, 42);
  assert.strictEqual(e.balloons, 2);
  assert.strictEqual(e.hits, 3);
  // Leaderboard file survives with no stray temp files left behind (atomic write).
  const leftovers = fs.readdirSync(path.dirname(file)).filter((f) => f.endsWith('.tmp'));
  assert.deepStrictEqual(leftovers, []);
});

test('top() ranks by wins, then best score, then total points', async () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  lb.recordRound('crown', [
    row('Fay', { score: 10, won: true }),
    row('Gus', { score: 99 }),
    row('Hal', { score: 50, points: 100 }),
  ]);
  lb.recordRound('crown', [row('Fay', { score: 5 })]);
  await lb.save();
  const top = lb.top('crown');
  assert.deepStrictEqual(top.map((e) => e.name), ['Fay', 'Gus', 'Hal']);
  assert.strictEqual(top[0].rank, 1);
  const summary = lb.summary();
  assert.strictEqual(summary.totals.crown, 3);
  assert.strictEqual(summary.modes.crown.length, 3);
  assert.strictEqual(summary.file, path.basename(file));
});

test('corrupt file is moved aside and replaced with a fresh board', () => {
  const { file } = tmpBoard();
  fs.writeFileSync(file, '{ this is not json');
  const lb = new Leaderboard(file);
  assert.deepStrictEqual(lb.board.modes, { crown: {}, blitz: {}, race: {}, teams: {}, boss: {} });
  assert.ok(fs.existsSync(file), 'fresh board written');
  const aside = fs.readdirSync(path.dirname(file)).filter((f) => f.includes('.corrupt-'));
  assert.strictEqual(aside.length, 1);
});

test('concurrent recordRound calls serialise their writes without losing data', async () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  for (let i = 0; i < 10; i++) {
    lb.recordRound('race', [row(`Pilot${i}`, { score: i * 10 })]);
  }
  await lb.save();
  const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(Object.keys(onDisk.modes.race).length, 10);
});

test('wallets: getOrCreateWallet initializes with defaults and normalizes name', async () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  const w1 = lb.getOrCreateWallet('  Renji  ');
  assert.strictEqual(w1.displayName, 'Renji');
  assert.strictEqual(w1.credits, 0);
  assert.strictEqual(w1.lifetimeCredits, 0);
  assert.ok(w1.unlocked.includes('wing_default'));
  assert.strictEqual(w1.equipped.wing, 'wing_default');
  assert.strictEqual(w1.equipped.finish, 'finish_default');
  await lb.save();

  // Re-fetch with different casing should return same wallet
  const w2 = lb.getOrCreateWallet('renji');
  assert.strictEqual(w2.displayName, 'renji');
  assert.strictEqual(w2, w1);
});

test('wallets: awardCredits, purchaseItem, equipItem, and spendCreditsForSponsor', async () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  const name = 'AcePilot';

  // 1. Award credits
  lb.awardCredits(name, 1000);
  await lb.save();
  let w = lb.getOrCreateWallet(name);
  assert.strictEqual(w.credits, 1000);
  assert.strictEqual(w.lifetimeCredits, 1000);

  // 2. Purchase item
  // wing_xwing costs 400 CR
  const buyRes = lb.purchaseItem(name, 'wing_xwing');
  assert.strictEqual(buyRes.ok, true);
  assert.strictEqual(buyRes.wallet.credits, 600);
  assert.ok(buyRes.wallet.unlocked.includes('wing_xwing'));
  assert.strictEqual(buyRes.wallet.equipped.wing, 'wing_xwing');

  // Purchasing already unlocked item fails
  const rebuyRes = lb.purchaseItem(name, 'wing_xwing');
  assert.strictEqual(rebuyRes.ok, false);
  assert.strictEqual(rebuyRes.error, 'Item already unlocked');

  // Purchasing item without enough credits fails
  // wing_saucer costs 1500 CR
  const unaffordableRes = lb.purchaseItem(name, 'wing_saucer');
  assert.strictEqual(unaffordableRes.ok, false);
  assert.strictEqual(unaffordableRes.error, 'Insufficient Sky Credits');

  // 3. Equip item
  // Equip back to default wing
  const equipRes = lb.equipItem(name, 'wing_default');
  assert.strictEqual(equipRes.ok, true);
  assert.strictEqual(equipRes.wallet.equipped.wing, 'wing_default');

  // Equip locked item fails
  const lockedEquip = lb.equipItem(name, 'wing_saucer');
  assert.strictEqual(lockedEquip.ok, false);
  assert.strictEqual(lockedEquip.error, 'Item not unlocked');

  // 4. Spend credits for sponsor
  // sponsor_double_event costs 150 CR
  const sponsorRes = lb.spendCreditsForSponsor(name, 'sponsor_double_event');
  assert.strictEqual(sponsorRes.ok, true);
  assert.strictEqual(sponsorRes.wallet.credits, 450); // 600 - 150

  // 5. Persistence across new instance
  await lb.save();
  const lb2 = new Leaderboard(file);
  const wReloaded = lb2.getOrCreateWallet(name);
  assert.strictEqual(wReloaded.credits, 450);
  assert.ok(wReloaded.unlocked.includes('wing_xwing'));
  assert.strictEqual(wReloaded.equipped.wing, 'wing_default');
});
