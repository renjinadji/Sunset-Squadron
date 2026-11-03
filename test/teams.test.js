'use strict';
// Red vs Blue team mode: leaderboard wiring + pure team-math the server shares
// with the round loop (balance rule, team totals). The socket-level behaviour
// (team assignment on join, friendly-fire-off rockets) is covered by the
// controller's scripted integration check, not here.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Leaderboard } = require('../leaderboard');
const { resolveTeamMatch, isFriendlyFire } = require('../server/logic');

function tmpBoard() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-teams-'));
  return { dir, file: path.join(dir, 'leaderboard.json') };
}

function row(name, over = {}) {
  return { name, pilot: 'kaya', score: 10, points: 10, balloons: 0, hits: 0, won: false, ...over };
}

test('teams is a first-class leaderboard mode (record, wins by team, summary)', async () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  // Red wins the team battle: everyone on red gets the win badge, not the top scorer
  let bests = lb.recordRound('teams', [
    row('Red1', { score: 30, points: 30, hits: 3, won: true }),
    row('Red2', { score: 12, points: 12, hits: 1, won: true }),
    row('Blu1', { score: 45, points: 45, hits: 4, won: false }),   // top individual, losing team
  ]);
  assert.deepStrictEqual(bests['Red1::kaya'], ['First round on the board', 'First win!']);
  assert.deepStrictEqual(bests['Blu1::kaya'], ['First round on the board']);
  await lb.save();
  assert.strictEqual(lb.board.modes.teams['Red1::kaya'].wins, 1);
  assert.strictEqual(lb.board.modes.teams['Blu1::kaya'].wins, 0);
  assert.strictEqual(lb.board.modes.teams['Blu1::kaya'].bestScore, 45);
  const summary = lb.summary(10);
  assert.ok(Array.isArray(summary.modes.teams));
  assert.strictEqual(summary.totals.teams, 3);
  assert.strictEqual(summary.modes.teams[0].name, 'Red1');   // win sorts above best score
});

test('teams rows count toward team totals without touching other modes', async () => {
  const { file } = tmpBoard();
  const lb = new Leaderboard(file);
  lb.recordRound('teams', [row('Solo', { score: 20, points: 20, won: true })]);
  lb.recordRound('crown', [row('Solo', { score: 5, points: 3 })]);
  await lb.save();
  assert.strictEqual(Object.keys(lb.board.modes.teams).length, 1);
  assert.strictEqual(Object.keys(lb.board.modes.crown).length, 1);
  assert.strictEqual(lb.board.modes.teams['Solo::kaya'].rounds, 1);
  assert.strictEqual(lb.board.modes.crown['Solo::kaya'].rounds, 1);
  // Reload round-trips the teams table
  const lb2 = new Leaderboard(file);
  assert.strictEqual(lb2.board.modes.teams['Solo::kaya'].bestScore, 20);
});

test('team balance rule: smaller team wins the tie, red alternates first', () => {
  // Mirrors the server's assignTeam() greedy rule (red <= blue -> red).
  const teams = [];
  const assign = () => {
    const red = teams.filter((t) => t === 'red').length;
    const blue = teams.filter((t) => t === 'blue').length;
    teams.push(red <= blue ? 'red' : 'blue');
  };
  for (let i = 0; i < 8; i++) assign();
  assert.deepStrictEqual(teams, ['red', 'blue', 'red', 'blue', 'red', 'blue', 'red', 'blue']);
  assert.strictEqual(teams.filter((t) => t === 'red').length, 4);
  assert.strictEqual(teams.filter((t) => t === 'blue').length, 4);
});

test('team totals: summed per-side score decides the winner (draw on equality)', () => {
  // Mirrors the server's endRound winnerTeam rule.
  const winnerTeam = ({ red, blue }) => (red > blue ? 'red' : blue > red ? 'blue' : null);
  assert.strictEqual(winnerTeam({ red: 30, blue: 21 }), 'red');
  assert.strictEqual(winnerTeam({ red: 10, blue: 11 }), 'blue');
  assert.strictEqual(winnerTeam({ red: 15, blue: 15 }), null);
});

test('resolveTeamMatch strictly enforces 1v1 and 2v2 sizing across various human counts', () => {
  const mkP = (id, name) => ({ id, name });

  // 1v1 Format (Total = 2 pilots: 1 Red vs 1 Blue)
  const m1_1 = resolveTeamMatch('1v1', [mkP('h1', 'Ace')]);
  assert.strictEqual(m1_1.format, '1v1');
  assert.strictEqual(m1_1.targetTotal, 2);
  assert.strictEqual(m1_1.teamSize, 1);
  assert.strictEqual(m1_1.neededBots, 1);
  assert.strictEqual(m1_1.redHumans.length, 1);
  assert.strictEqual(m1_1.blueHumans.length, 0);

  const m1_2 = resolveTeamMatch('1v1', [mkP('h1', 'Ace'), mkP('h2', 'Duke')]);
  assert.strictEqual(m1_2.targetTotal, 2);
  assert.strictEqual(m1_2.neededBots, 0);
  assert.strictEqual(m1_2.redHumans.length, 1);
  assert.strictEqual(m1_2.blueHumans.length, 1);

  const m1_3 = resolveTeamMatch('1v1', [mkP('h1', 'Ace'), mkP('h2', 'Duke'), mkP('h3', 'Pip')]);
  assert.strictEqual(m1_3.targetTotal, 2);
  assert.strictEqual(m1_3.activeHumans.length, 2);
  assert.strictEqual(m1_3.neededBots, 0);

  // 2v2 Format (Total = 4 pilots: 2 Red vs 2 Blue)
  const m2_1 = resolveTeamMatch('2v2', [mkP('h1', 'Ace')]);
  assert.strictEqual(m2_1.format, '2v2');
  assert.strictEqual(m2_1.targetTotal, 4);
  assert.strictEqual(m2_1.teamSize, 2);
  assert.strictEqual(m2_1.neededBots, 3);
  assert.strictEqual(m2_1.redHumans.length, 1);
  assert.strictEqual(m2_1.blueHumans.length, 0);

  const m2_2 = resolveTeamMatch('2v2', [mkP('h1', 'Ace'), mkP('h2', 'Duke')]);
  assert.strictEqual(m2_2.targetTotal, 4);
  assert.strictEqual(m2_2.neededBots, 2);
  // Balanced: 1 human on Red, 1 human on Blue
  assert.strictEqual(m2_2.redHumans.length, 1);
  assert.strictEqual(m2_2.blueHumans.length, 1);

  const m2_3 = resolveTeamMatch('2v2', [mkP('h1', 'Ace'), mkP('h2', 'Duke'), mkP('h3', 'Pip')]);
  assert.strictEqual(m2_3.targetTotal, 4);
  assert.strictEqual(m2_3.neededBots, 1);
  assert.strictEqual(m2_3.redHumans.length, 2);
  assert.strictEqual(m2_3.blueHumans.length, 1);

  const m2_4 = resolveTeamMatch('2v2', [mkP('h1', 'Ace'), mkP('h2', 'Duke'), mkP('h3', 'Pip'), mkP('h4', 'Zed')]);
  assert.strictEqual(m2_4.targetTotal, 4);
  assert.strictEqual(m2_4.neededBots, 0);
  assert.strictEqual(m2_4.redHumans.length, 2);
  assert.strictEqual(m2_4.blueHumans.length, 2);

  const m2_5 = resolveTeamMatch('2v2', [mkP('h1', 'Ace'), mkP('h2', 'Duke'), mkP('h3', 'Pip'), mkP('h4', 'Zed'), mkP('h5', 'Fox')]);
  assert.strictEqual(m2_5.targetTotal, 4);
  assert.strictEqual(m2_5.activeHumans.length, 4);
  assert.strictEqual(m2_5.neededBots, 0);
});

test('isFriendlyFire protects teammates in Red vs Blue and allies in Boss Raid', () => {
  // Red vs Blue friendly fire checks
  assert.strictEqual(isFriendlyFire('teams', 'red', 'red', 'p1', 'p2'), true);
  assert.strictEqual(isFriendlyFire('teams', 'blue', 'blue', 'p1', 'p2'), true);
  assert.strictEqual(isFriendlyFire('teams', 'red', 'blue', 'p1', 'p2'), false);
  assert.strictEqual(isFriendlyFire('teams', 'blue', 'red', 'p1', 'p2'), false);
  assert.strictEqual(isFriendlyFire('teams', null, 'blue', 'p1', 'p2'), false);
  assert.strictEqual(isFriendlyFire('teams', 'red', 'red', 'p1', 'p1'), true); // self

  // Boss Raid friendly fire checks
  assert.strictEqual(isFriendlyFire('boss', null, null, 'p1', 'p2'), true);      // ally on ally
  assert.strictEqual(isFriendlyFire('boss', null, null, 'bot1', 'p1'), true);    // bot on human ally
  assert.strictEqual(isFriendlyFire('boss', null, null, 'p1', 'boss'), false);   // ally on boss
  assert.strictEqual(isFriendlyFire('boss', null, null, 'boss', 'p1'), false);   // boss on ally

  // Free-for-all modes (crown, blitz, race)
  assert.strictEqual(isFriendlyFire('crown', 'red', 'red', 'p1', 'p2'), false);
  assert.strictEqual(isFriendlyFire('blitz', 'red', 'red', 'p1', 'p2'), false);
  assert.strictEqual(isFriendlyFire('race', 'red', 'red', 'p1', 'p2'), false);
});

test('friendly fire immunity for rockets, homing missiles, radar lock, and proximity mines in Red vs Blue', () => {
  // Test rocket collision friendly-fire filtering
  const rocket = { id: 1, owner: 'red-human-1', team: 'red', p: { x: 0, y: 70, z: 0 } };
  const allyTarget = { id: 'red-human-2', team: 'red', pos: { x: 2, y: 70, z: 0 } };
  const enemyTarget = { id: 'blue-human-1', team: 'blue', pos: { x: 2, y: 70, z: 0 } };

  // Helper matching server.js stepRockets friendly-fire guard
  const canRocketHit = (r, p, mode = 'teams') => {
    if (p.id === r.owner) return false;
    const shooterTeam = r.team;
    if (mode === 'teams' && shooterTeam && p.team && shooterTeam === p.team) return false;
    if (mode === 'boss' && r.owner !== 'boss') return false;
    return true;
  };

  assert.strictEqual(canRocketHit(rocket, allyTarget), false, 'Ally cannot be hit by teammate rocket');
  assert.strictEqual(canRocketHit(rocket, enemyTarget), true, 'Enemy can be hit by rocket');

  // Test proximity sky mine friendly-fire filtering
  const mine = { id: 1, owner: 'blue-bot-1', team: 'blue', p: { x: 50, y: 80, z: 50 } };
  const allyPilot = { id: 'blue-human-1', team: 'blue', pos: { x: 52, y: 80, z: 52 } };
  const enemyPilot = { id: 'red-human-1', team: 'red', pos: { x: 52, y: 80, z: 52 } };

  const canMineDetonate = (m, p, mode = 'teams') => {
    if (p.id === m.owner) return false;
    const minerTeam = m.team;
    if (mode === 'teams' && minerTeam && p.team && minerTeam === p.team) return false;
    if (mode === 'boss' && m.owner !== 'boss') return false;
    return true;
  };

  assert.strictEqual(canMineDetonate(mine, allyPilot), false, 'Ally cannot trigger friendly mine');
  assert.strictEqual(canMineDetonate(mine, enemyPilot), true, 'Enemy triggers mine');

  // Test radar missile target acquisition filtering
  const canRadarLock = (shooter, target, mode = 'teams') => {
    if (!target || target.id === shooter.id) return false;
    const isTeammate = mode === 'teams' && shooter.team && target.team && shooter.team === target.team;
    const isBossAlly = mode === 'boss' && shooter.id !== 'boss';
    return !isTeammate && !isBossAlly;
  };

  const redShooter = { id: 'red-1', team: 'red' };
  const redWingman = { id: 'red-2', team: 'red' };
  const blueOpponent = { id: 'blue-1', team: 'blue' };

  assert.strictEqual(canRadarLock(redShooter, redWingman), false, 'Radar lock cannot target friendly wingman');
  assert.strictEqual(canRadarLock(redShooter, blueOpponent), true, 'Radar lock targets enemy pilot');
});
