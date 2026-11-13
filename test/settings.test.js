// test/settings.test.js - Unit tests for control sensitivity configuration,
// in-game camera zoom adjustments, pitch inversion, and settings persistence.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Controls } from '../public/js/controls.js';
import { clamp } from '../server/logic.js';

function createMockElement() {
  const listeners = new Map();
  return {
    style: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
        return this._classes.has(c);
      },
      has(c) { return this._classes.has(c); },
    },
    addEventListener(evt, fn) {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    },
    dispatchEvent(evt) {
      const fns = listeners.get(evt.type) || [];
      for (const fn of fns) fn(evt);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 100 };
    },
  };
}

function setupMockEnv() {
  const winListeners = new Map();
  const docListeners = new Map();

  globalThis.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener(evt, fn) {
      if (!winListeners.has(evt)) winListeners.set(evt, []);
      winListeners.get(evt).push(fn);
    },
    removeEventListener(evt, fn) {
      const fns = winListeners.get(evt) || [];
      const idx = fns.indexOf(fn);
      if (idx >= 0) fns.splice(idx, 1);
    },
    dispatchEvent(evt) {
      const fns = winListeners.get(evt.type) || [];
      for (const fn of fns) fn(evt);
    },
  };

  globalThis.document = {
    addEventListener(evt, fn) {
      if (!docListeners.has(evt)) docListeners.set(evt, []);
      docListeners.get(evt).push(fn);
    },
    removeEventListener(evt, fn) {
      const fns = docListeners.get(evt) || [];
      const idx = fns.indexOf(fn);
      if (idx >= 0) fns.splice(idx, 1);
    },
    dispatchEvent(evt) {
      const fns = docListeners.get(evt.type) || [];
      for (const fn of fns) fn(evt);
    },
  };

  return {
    dispatchWin(type, data = {}) {
      window.dispatchEvent({ type, preventDefault() {}, ...data });
    },
  };
}

test('Controls sensitivity: defaults to 1.0 and setSensitivity clamps safely', () => {
  setupMockEnv();
  const layer = createMockElement();
  const joyBase = createMockElement();
  const joyKnob = createMockElement();
  const boostBtn = createMockElement();
  const fireBtn = createMockElement();

  const ctrl = new Controls(layer, joyBase, joyKnob, boostBtn, fireBtn);
  assert.equal(ctrl.sensitivity, 1.0, 'Default sensitivity must be 1.0 (100%)');

  ctrl.setSensitivity(0.5);
  assert.equal(ctrl.sensitivity, 0.5, 'Sensitivity sets to 0.5');

  ctrl.setSensitivity(2.0);
  assert.equal(ctrl.sensitivity, 2.0, 'Sensitivity sets to 2.0');

  // Clamps minimum bound to 0.3
  ctrl.setSensitivity(0.1);
  assert.equal(ctrl.sensitivity, 0.3, 'Sensitivity clamped to minimum 0.3');

  // Clamps maximum bound to 3.0
  ctrl.setSensitivity(5.0);
  assert.equal(ctrl.sensitivity, 3.0, 'Sensitivity clamped to maximum 3.0');

  // Gracefully handles invalid / non-numeric input without changing current value
  ctrl.setSensitivity('not-a-number');
  assert.equal(ctrl.sensitivity, 3.0, 'Invalid string input leaves sensitivity unchanged');

  ctrl.setSensitivity(NaN);
  assert.equal(ctrl.sensitivity, 3.0, 'NaN leaves sensitivity unchanged');
});

test('Controls sensitivity scales keyboard steering responsiveness dynamically', () => {
  const env = setupMockEnv();
  const layer = createMockElement();
  const joyBase = createMockElement();
  const joyKnob = createMockElement();
  const boostBtn = createMockElement();
  const fireBtn = createMockElement();

  const ctrl = new Controls(layer, joyBase, joyKnob, boostBtn, fireBtn);
  ctrl.setEnabled(true);

  // Normal 100% sensitivity: W = -1, D = 1
  ctrl.setSensitivity(1.0);
  env.dispatchWin('keydown', { key: 'w' });
  env.dispatchWin('keydown', { key: 'd' });
  assert.equal(ctrl.joyY, -1.0);
  assert.equal(ctrl.joyX, 1.0);

  // Change sensitivity to 0.5 (Low 50% preset)
  ctrl.setSensitivity(0.5);
  ctrl._applyKeys();
  assert.equal(ctrl.joyY, -0.5, 'Pitch scales by 0.5 sensitivity');
  assert.equal(ctrl.joyX, 0.5, 'Roll/turn scales by 0.5 sensitivity');

  // Change sensitivity to 1.5 (High 150% preset)
  ctrl.setSensitivity(1.5);
  ctrl._applyKeys();
  assert.equal(ctrl.joyY, -1.5, 'Pitch scales by 1.5 sensitivity');
  assert.equal(ctrl.joyX, 1.5, 'Roll/turn scales by 1.5 sensitivity');

  // Release keys resets to 0
  env.dispatchWin('keyup', { key: 'w' });
  env.dispatchWin('keyup', { key: 'd' });
  assert.equal(ctrl.joyX, 0);
  assert.equal(ctrl.joyY, 0);
});

test('Controls sensitivity scales touch virtual stick inputs', () => {
  setupMockEnv();
  const layer = createMockElement();
  const joyBase = createMockElement();
  const joyKnob = createMockElement();
  const boostBtn = createMockElement();
  const fireBtn = createMockElement();

  const ctrl = new Controls(layer, joyBase, joyKnob, boostBtn, fireBtn);
  ctrl.setEnabled(true);
  ctrl.setSensitivity(1.2);

  // Simulate touch start on left half
  layer.dispatchEvent({
    type: 'touchstart',
    preventDefault() {},
    changedTouches: [{ identifier: 10, clientX: 200, clientY: 300 }],
    touches: [{ identifier: 10, clientX: 200, clientY: 300 }],
  });

  // Touch move right by JOY_RADIUS (65px)
  layer.dispatchEvent({
    type: 'touchmove',
    preventDefault() {},
    changedTouches: [{ identifier: 10, clientX: 265, clientY: 300 }],
    touches: [{ identifier: 10, clientX: 265, clientY: 300 }],
  });

  // dx = 65, dx / JOY_RADIUS = 1.0, * sensitivity (1.2) = 1.2
  assert.equal(Math.round(ctrl.joyX * 100) / 100, 1.2);
  assert.equal(ctrl.joyY, 0);

  // End touch
  layer.dispatchEvent({
    type: 'touchend',
    preventDefault() {},
    changedTouches: [{ identifier: 10, clientX: 265, clientY: 300 }],
    touches: [],
  });
  assert.equal(ctrl.joyX, 0);
  assert.equal(ctrl.joyY, 0);
});

test('Controls two-finger pinch-to-zoom invokes onPinchZoom callback', () => {
  setupMockEnv();
  const layer = createMockElement();
  const joyBase = createMockElement();
  const joyKnob = createMockElement();
  const boostBtn = createMockElement();
  const fireBtn = createMockElement();

  const ctrl = new Controls(layer, joyBase, joyKnob, boostBtn, fireBtn);
  ctrl.setEnabled(true);

  let pinchDeltas = [];
  ctrl.onPinchZoom = (delta) => pinchDeltas.push(delta);

  // Initial 2-finger touch: distance = 100px
  layer.dispatchEvent({
    type: 'touchstart',
    preventDefault() {},
    changedTouches: [
      { identifier: 1, clientX: 100, clientY: 200 },
      { identifier: 2, clientX: 200, clientY: 200 },
    ],
    touches: [
      { identifier: 1, clientX: 100, clientY: 200 },
      { identifier: 2, clientX: 200, clientY: 200 },
    ],
  });

  // Move fingers apart: distance = 160px (+60px spread -> zoom in)
  layer.dispatchEvent({
    type: 'touchmove',
    preventDefault() {},
    changedTouches: [
      { identifier: 1, clientX: 70, clientY: 200 },
      { identifier: 2, clientX: 230, clientY: 200 },
    ],
    touches: [
      { identifier: 1, clientX: 70, clientY: 200 },
      { identifier: 2, clientX: 230, clientY: 200 },
    ],
  });

  assert.ok(pinchDeltas.length > 0, 'Pinch spread must trigger onPinchZoom');
  assert.ok(pinchDeltas[0] > 0, 'Pinch spread delta must be positive (zoom in)');

  // Move fingers closer: distance = 90px (-70px pinch -> zoom out)
  pinchDeltas = [];
  layer.dispatchEvent({
    type: 'touchmove',
    preventDefault() {},
    changedTouches: [
      { identifier: 1, clientX: 110, clientY: 200 },
      { identifier: 2, clientX: 190, clientY: 200 },
    ],
    touches: [
      { identifier: 1, clientX: 110, clientY: 200 },
      { identifier: 2, clientX: 190, clientY: 200 },
    ],
  });

  assert.ok(pinchDeltas.length > 0, 'Pinch squeeze must trigger onPinchZoom');
  assert.ok(pinchDeltas[0] < 0, 'Pinch squeeze delta must be negative (zoom out)');
});

test('Camera zoom adjustments clamp strictly between 60% and 160%', () => {
  const clampZoom = (val, delta) => clamp(Math.round((val + delta) * 100) / 100, 0.6, 1.6);

  // Base normal
  assert.equal(clampZoom(1.0, 0.1), 1.1);
  assert.equal(clampZoom(1.0, -0.1), 0.9);

  // Upper clamp limit (160% / 1.6x)
  assert.equal(clampZoom(1.55, 0.2), 1.6);
  assert.equal(clampZoom(1.6, 0.1), 1.6);

  // Lower clamp limit (60% / 0.6x)
  assert.equal(clampZoom(0.65, -0.2), 0.6);
  assert.equal(clampZoom(0.6, -0.1), 0.6);
});

test('Camera kinematics math preserves exact baseline at 100% zoom and scales smoothly', () => {
  const computeCameraOffset = (zoom, speed = 48) => {
    const SPEED_BASE = 48;
    const zMult = 1 / Math.max(0.4, zoom);
    const height = 5 * zMult;
    const dist = (17 + (speed - SPEED_BASE) * 0.06) * zMult;
    const lookDist = 26 * zMult;
    const lookHeight = 2.5 * zMult;
    const targetFov = 60 / Math.sqrt(zoom);
    return { height, dist, lookDist, lookHeight, targetFov };
  };

  // At zoom = 1.0 (default 100%)
  const base = computeCameraOffset(1.0);
  assert.equal(base.height, 5.0, 'Height at 100% matches original 5.0m');
  assert.equal(base.dist, 17.0, 'Distance at 100% matches original 17.0m');
  assert.equal(base.lookDist, 26.0, 'Look-at dist matches original 26.0m');
  assert.equal(base.lookHeight, 2.5, 'Look-at height matches original 2.5m');
  assert.equal(base.targetFov, 60.0, 'FOV at 100% matches original 60 deg');

  // At zoom = 1.35 (Close preset)
  const close = computeCameraOffset(1.35);
  assert.ok(close.dist < base.dist, 'Close preset brings camera closer to the aircraft');
  assert.ok(close.height < base.height, 'Close preset lowers camera height for tighter cockpit tracking');
  assert.ok(close.targetFov < base.targetFov, 'Close preset tightens FOV for cinematic action view');

  // At zoom = 0.70 (Wide tactical preset)
  const wide = computeCameraOffset(0.70);
  assert.ok(wide.dist > base.dist, 'Wide preset pulls camera further back');
  assert.ok(wide.height > base.height, 'Wide preset elevates camera for panoramic battlefield view');
  assert.ok(wide.targetFov > base.targetFov, 'Wide preset widens FOV to enhance situational awareness');
});

test('Pitch inversion: properly inverts Y-axis flight control input', () => {
  const calculatePitchInput = (joyY, invertPitch) => joyY * (invertPitch ? -1 : 1);

  // Standard pitch (dive down on forward/up, climb on pull back/down)
  assert.equal(calculatePitchInput(-1.0, false), -1.0);
  assert.equal(calculatePitchInput(1.0, false), 1.0);

  // Inverted pitch (flight yoke mode: push forward = dive, pull back = climb)
  assert.equal(calculatePitchInput(-1.0, true), 1.0);
  assert.equal(calculatePitchInput(1.0, true), -1.0);
});
