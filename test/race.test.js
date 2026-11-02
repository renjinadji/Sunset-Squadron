'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const logic = require('../server/logic');

test('race finish points scale by finish rank with floor', () => {
  assert.equal(logic.raceFinishPoints(1), 100);
  assert.equal(logic.raceFinishPoints(2), 85);
  assert.equal(logic.raceFinishPoints(3), 70);
  assert.equal(logic.raceFinishPoints(4), 55);
  assert.equal(logic.raceFinishPoints(5), 40);
  assert.equal(logic.raceFinishPoints(6), 25);
  assert.equal(logic.raceFinishPoints(7), 25); // floored at RACE_FINISH_MIN
});

test('race results sort finishers ahead of DNF, by rank then time, and DNF by gates passed', () => {
  const p1 = { name: 'Ace', race: { finished: true, finishRank: 1, finishTime: 28.5, gatesPassed: 10 }, score: 100 };
  const p2 = { name: 'Blaze', race: { finished: true, finishRank: 2, finishTime: 31.2, gatesPassed: 10 }, score: 85 };
  const p3 = { name: 'Crow', race: { finished: false, finishRank: 0, finishTime: 0, gatesPassed: 8 }, score: 40 };
  const p4 = { name: 'Dawn', race: { finished: false, finishRank: 0, finishTime: 0, gatesPassed: 4 }, score: 20 };

  const sorted = [p3, p1, p4, p2].sort(logic.compareRaceResults);
  assert.deepEqual(sorted.map((p) => p.name), ['Ace', 'Blaze', 'Crow', 'Dawn']);
});

test('isRaceComplete correctly detects when all active racers have finished', () => {
  const racers = [
    { id: 'h1', isBot: false, gone: false, race: { finished: false, finishRank: 0 } },
    { id: 'b1', isBot: true, gone: false, race: { finished: false, finishRank: 0 } },
  ];

  assert.equal(logic.isRaceComplete(racers), false);

  // Human crosses final gate
  racers[0].race.finished = true;
  racers[0].race.finishRank = 1;
  assert.equal(logic.isRaceComplete(racers), false);
  assert.equal(logic.areHumanRacersFinished(racers), true);

  // Bot crosses final gate
  racers[1].race.finished = true;
  racers[1].race.finishRank = 2;
  assert.equal(logic.isRaceComplete(racers), true);
});

test('isRaceComplete handles disconnected racers without blocking round finish', () => {
  const racers = [
    { id: 'h1', isBot: false, gone: false, race: { finished: true, finishRank: 1 } },
    { id: 'h2', isBot: false, gone: true, race: { finished: false, finishRank: 0 } }, // disconnected
  ];

  // Because h2 is gone, all active participants (h1) are finished
  assert.equal(logic.isRaceComplete(racers), true);
  assert.equal(logic.areHumanRacersFinished(racers), true);
});
