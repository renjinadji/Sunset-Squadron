'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MAPS, MAP_METADATA, mapById, toEsModuleSource } = require('../shared/maps');
const {
  generateLayout,
  generateArchipelagoLayout,
  generateCanyonLayout,
  generateCitadelLayout,
  generateSpiresLayout,
  islandCollision,
  mulberry32,
} = require('../server/logic');

test('shared/maps catalog defines 4 distinct biome maps with rich metadata', () => {
  assert.deepEqual(MAPS, ['archipelago', 'canyon', 'citadel', 'spires']);

  for (const id of MAPS) {
    const meta = mapById(id);
    assert.equal(meta.id, id);
    assert.ok(typeof meta.name === 'string' && meta.name.length > 0, `Map ${id} must have a name`);
    assert.ok(typeof meta.desc === 'string' && meta.desc.length > 0, `Map ${id} must have a description`);
    assert.ok(typeof meta.tag === 'string' && meta.tag.length > 0, `Map ${id} must have a tag`);
    assert.ok(typeof meta.waterColor === 'number', `Map ${id} must have a numeric waterColor`);
  }

  // Fallback for unknown map id
  assert.equal(mapById('unknown-map').id, 'archipelago');
});

test('shared/maps toEsModuleSource generates valid browser export', () => {
  const src = toEsModuleSource();
  assert.ok(src.includes('export const MAPS ='));
  assert.ok(src.includes('export const MAP_METADATA ='));
  assert.ok(src.includes('export function mapById'));
  assert.ok(src.includes('Caldera Archipelago'));
  assert.ok(src.includes('Canyon Trenches'));
  assert.ok(src.includes('Sky Citadel'));
  assert.ok(src.includes('Neon Spires'));
});

test('generateLayout generates valid deterministic layouts across all 4 maps', () => {
  const seed = 987654321;

  for (const mapId of MAPS) {
    const layout1 = generateLayout(seed, mapId);
    const layout2 = generateLayout(seed, mapId);

    assert.equal(layout1.map, mapId);
    assert.equal(layout1.seed, seed);
    assert.ok(Array.isArray(layout1.islands) && layout1.islands.length > 0, `${mapId} must have islands`);
    assert.ok(Array.isArray(layout1.arches) && layout1.arches.length > 0, `${mapId} must have arches`);
    assert.ok(Array.isArray(layout1.balloons) && layout1.balloons.length > 0, `${mapId} must have balloons`);
    assert.ok(Array.isArray(layout1.clouds) && layout1.clouds.length > 0, `${mapId} must have clouds`);

    // Deterministic check: layouts with the same seed must match exactly
    assert.deepEqual(layout1, layout2, `Layout for ${mapId} must be strictly deterministic per seed`);

    // Ensure every island has valid collision ellipsoid coordinates
    for (const isl of layout1.islands) {
      assert.ok(typeof isl.cx === 'number' && Number.isFinite(isl.cx));
      assert.ok(typeof isl.cy === 'number' && Number.isFinite(isl.cy));
      assert.ok(typeof isl.cz === 'number' && Number.isFinite(isl.cz));
      assert.ok(typeof isl.rx === 'number' && isl.rx > 0);
      assert.ok(typeof isl.ry === 'number' && isl.ry > 0);
      assert.ok(typeof (isl.rz || isl.rx) === 'number' && (isl.rz || isl.rx) > 0);
    }
  }
});

test('map-specific island kinds and arch styles are preserved', () => {
  const seed = 424242;

  // 1. Archipelago
  const archi = generateLayout(seed, 'archipelago');
  assert.ok(archi.islands.some((i) => i.kind === 'central'));
  assert.ok(archi.islands.some((i) => i.kind === 'floating'));
  assert.ok(archi.arches.every((a) => a.style === 'classic'));

  // 2. Canyon Trenches
  const canyon = generateLayout(seed, 'canyon');
  assert.ok(canyon.islands.some((i) => i.kind === 'canyon_wall'));
  assert.ok(canyon.islands.some((i) => i.kind === 'mesa'));
  assert.ok(canyon.arches.every((a) => a.style === 'sandstone'));

  // 3. Sky Citadel
  const citadel = generateLayout(seed, 'citadel');
  assert.ok(citadel.islands.some((i) => i.kind === 'citadel'));
  assert.ok(citadel.islands.some((i) => i.kind === 'aerostat'));
  assert.ok(citadel.islands.some((i) => i.kind === 'spire_tower'));
  assert.ok(citadel.arches.every((a) => a.style === 'cyber'));

  // 4. Neon Spires
  const spires = generateLayout(seed, 'spires');
  assert.ok(spires.islands.some((i) => i.kind === 'karst_needle'));
  assert.ok(spires.islands.some((i) => i.kind === 'floating'));
  assert.ok(spires.arches.every((a) => a.style === 'karst'));
});

test('islandCollision supports elongated X/Z collision ellipsoids (e.g. canyon walls)', () => {
  const wall = {
    kind: 'canyon_wall',
    cx: 0,
    cy: 20,
    cz: 0,
    rx: 100, // elongated along X
    ry: 40,
    rz: 30,  // narrow along Z
  };

  // Inside near center
  const insideHit = islandCollision({ x: 0, y: 20, z: 0 }, [wall]);
  assert.ok(insideHit !== null, 'Center must be inside collision ellipsoid');
  assert.ok(insideHit.push > 0, 'Push distance must be positive');

  // Point at x=80, z=0: (80/100)^2 = 0.64 < 1 -> inside
  const longAxisHit = islandCollision({ x: 80, y: 20, z: 0 }, [wall]);
  assert.ok(longAxisHit !== null, 'x=80 should be inside elongated X axis (rx=100)');

  // Point at x=0, z=50: (50/30)^2 = 2.77 > 1 -> outside
  const shortAxisMiss = islandCollision({ x: 0, y: 20, z: 50 }, [wall]);
  assert.equal(shortAxisMiss, null, 'z=50 should be outside narrow Z axis (rz=30)');

  // Point at x=120, z=0: (120/100)^2 = 1.44 > 1 -> outside
  const longAxisMiss = islandCollision({ x: 120, y: 20, z: 0 }, [wall]);
  assert.equal(longAxisMiss, null, 'x=120 should be outside long X axis (rx=100)');
});

test('balloons generated across all 4 maps avoid spawning inside islands', () => {
  const seed = 12345;
  for (const mapId of MAPS) {
    const layout = generateLayout(seed, mapId);
    assert.ok(layout.balloons.length >= 40, `${mapId} should have >= 40 balloons`);
    for (const b of layout.balloons) {
      // Check balloon altitude
      assert.ok(b.y >= 30 && b.y <= 160, `Balloon altitude ${b.y} outside valid range`);
      // Verify no balloon is deep inside any island ellipsoid
      const hit = islandCollision({ x: b.x, y: b.y, z: b.z }, layout.islands);
      assert.equal(hit, null, `Balloon at (${b.x}, ${b.y}, ${b.z}) should not collide with island on ${mapId}`);
    }
  }
});
