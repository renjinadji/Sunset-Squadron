// test/desktop.test.js - Unit tests for laptop/desktop compatibility,
// resilient WebGL context initialization fallbacks, and keyboard/mouse flight controls.

import test from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// 1. Controls test with mocked DOM elements
// ---------------------------------------------------------------------------
import { Controls } from '../public/js/controls.js';

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

// Minimal window & document mocks for testing Controls in Node
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

test('desktop controls: WASD and Arrow keys steer the aircraft', () => {
  const env = setupMockEnv();
  const layer = createMockElement();
  const joyBase = createMockElement();
  const joyKnob = createMockElement();
  const boostBtn = createMockElement();
  const fireBtn = createMockElement();

  const ctrl = new Controls(layer, joyBase, joyKnob, boostBtn, fireBtn);
  ctrl.setEnabled(true);

  // W = pitch down (joyY = -1)
  env.dispatchWin('keydown', { key: 'w' });
  assert.equal(ctrl.joyY, -1, 'W key should pitch down');
  assert.equal(ctrl.joyX, 0);

  // D = turn right (joyX = 1)
  env.dispatchWin('keydown', { key: 'd' });
  assert.equal(ctrl.joyX, 1, 'D key should turn right');
  assert.equal(ctrl.joyY, -1);

  // Release W
  env.dispatchWin('keyup', { key: 'w' });
  assert.equal(ctrl.joyY, 0, 'Releasing W resets pitch');
  assert.equal(ctrl.joyX, 1, 'D key remains active');

  // Release D
  env.dispatchWin('keyup', { key: 'd' });
  assert.equal(ctrl.joyX, 0);

  // Arrow keys support (ArrowUp, ArrowLeft)
  env.dispatchWin('keydown', { key: 'ArrowUp' });
  env.dispatchWin('keydown', { key: 'ArrowLeft' });
  assert.equal(ctrl.joyY, -1);
  assert.equal(ctrl.joyX, -1);

  env.dispatchWin('keyup', { key: 'ArrowUp' });
  env.dispatchWin('keyup', { key: 'ArrowLeft' });
  assert.equal(ctrl.joyX, 0);
  assert.equal(ctrl.joyY, 0);
});

test('desktop controls: keyboard steering is NEVER locked out by mouse clicks', () => {
  const env = setupMockEnv();
  const layer = createMockElement();
  const joyBase = createMockElement();
  const joyKnob = createMockElement();
  const boostBtn = createMockElement();
  const fireBtn = createMockElement();

  const ctrl = new Controls(layer, joyBase, joyKnob, boostBtn, fireBtn);
  ctrl.setEnabled(true);

  // Hold 'A' key to turn left
  env.dispatchWin('keydown', { key: 'a' });
  assert.equal(ctrl.joyX, -1);

  // User clicks on empty sky (button 0)
  layer.dispatchEvent({
    type: 'mousedown',
    button: 0,
    clientX: 400,
    clientY: 400,
    preventDefault() {},
  });

  // Left click should trigger fire
  assert.equal(ctrl.fire, true, 'Left click on empty sky fires fireworks');
  // Keyboard flight steering must still be active!
  assert.equal(ctrl.joyX, -1, 'Keyboard steering must NOT be locked out by mouse click');

  // User releases mouse
  env.dispatchWin('mouseup', { button: 0 });
  assert.equal(ctrl.fire, false, 'Releasing click stops fire');
  assert.equal(ctrl.joyX, -1, 'Steering remains active while key held');

  env.dispatchWin('keyup', { key: 'a' });
  assert.equal(ctrl.joyX, 0);
});

test('desktop controls: Space and Left-Click fire; Shift, Q, E, and Right-Click roll & boost', () => {
  const env = setupMockEnv();
  const layer = createMockElement();
  const joyBase = createMockElement();
  const joyKnob = createMockElement();
  const boostBtn = createMockElement();
  const fireBtn = createMockElement();

  const ctrl = new Controls(layer, joyBase, joyKnob, boostBtn, fireBtn);
  ctrl.setEnabled(true);

  // Spacebar = fire
  env.dispatchWin('keydown', { key: ' ' });
  assert.equal(ctrl.fire, true);
  env.dispatchWin('keyup', { key: ' ' });
  assert.equal(ctrl.fire, false);

  // Shift = boost
  env.dispatchWin('keydown', { key: 'Shift' });
  assert.equal(ctrl.boost, true);
  env.dispatchWin('keyup', { key: 'Shift' });
  assert.equal(ctrl.boost, false);
  // Quick shift tap triggers roll tap
  assert.equal(ctrl.takeRollTap(), true, 'Quick shift tap queues barrel roll');
  assert.equal(ctrl.takeRollTap(), false);

  // Q and E keys trigger barrel roll
  env.dispatchWin('keydown', { key: 'q' });
  assert.equal(ctrl.takeRollTap(), true, 'Q triggers barrel roll tap');
  env.dispatchWin('keyup', { key: 'q' });

  env.dispatchWin('keydown', { key: 'e' });
  assert.equal(ctrl.takeRollTap(), true, 'E triggers barrel roll tap');
  env.dispatchWin('keyup', { key: 'e' });

  // Right-click = boost on desktop
  layer.dispatchEvent({
    type: 'mousedown',
    button: 2,
    clientX: 500,
    clientY: 500,
    preventDefault() {},
  });
  assert.equal(ctrl.boost, true, 'Right click activates boost');
  env.dispatchWin('mouseup', { button: 2 });
  assert.equal(ctrl.boost, false);
  assert.equal(ctrl.takeRollTap(), true, 'Quick right-click tap queues roll');
});

test('desktop controls: radar targeting tap handler is invoked on click', () => {
  setupMockEnv();
  const layer = createMockElement();
  const joyBase = createMockElement();
  const joyKnob = createMockElement();
  const boostBtn = createMockElement();
  const fireBtn = createMockElement();

  const ctrl = new Controls(layer, joyBase, joyKnob, boostBtn, fireBtn);
  ctrl.setEnabled(true);

  let targetedCoords = null;
  ctrl.onTargetTap = (x, y) => {
    targetedCoords = { x, y };
    return true; // Target locked!
  };

  layer.dispatchEvent({
    type: 'mousedown',
    button: 0,
    clientX: 720,
    clientY: 360,
    preventDefault() {},
  });

  assert.deepEqual(targetedCoords, { x: 720, y: 360 }, 'Target tap handler must receive click coordinates');
  assert.equal(ctrl.fire, false, 'Successful target lock does not trigger normal firework fire');
});

// ---------------------------------------------------------------------------
// 2. Resilient WebGL Context Allocation Simulation
// ---------------------------------------------------------------------------
import { createResilientRenderer } from '../public/js/graphics.js';

test('createResilientRenderer: recovers gracefully across fallback tiers when high-performance webgl2 fails', () => {
  // Simulate a laptop canvas where high-performance webgl2 returns null
  // but standard webgl2 or webgl1 succeeds.
  const attempts = [];
  const mockCanvas = {
    id: 'game-canvas',
    className: '',
    style: {},
    width: 800,
    height: 600,
    listeners: new Map(),
    addEventListener(evt, fn) {
      if (!this.listeners.has(evt)) this.listeners.set(evt, []);
      this.listeners.get(evt).push(fn);
    },
    getContext(type, attrs = {}) {
      attempts.push({ type, attrs });
      // Simulate macOS laptop with powerPreference high-performance failing,
      // but succeeding when powerPreference is default or omitted
      if (type === 'webgl2' && attrs.powerPreference === 'high-performance') {
        return null;
      }
      // Return a simulated WebGL2RenderingContext
      return {
        isMockGL: true,
        type,
        canvas: this,
        getExtension() { return null; },
        getParameter() { return 'Mock GPU Renderer'; },
      };
    },
  };

  const mockFactory = (opts) => ({
    isMockRenderer: true,
    opts,
    getContext() { return opts.context; },
    setSize() {},
  });

  const res = createResilientRenderer(mockCanvas, { antialias: false, alpha: false }, mockFactory);
  assert.ok(res, 'createResilientRenderer must return result object');
  assert.ok(res.gl, 'Must have acquired a GL context');
  assert.equal(res.gl.isMockGL, true);
  // Verify listeners were attached
  assert.ok(mockCanvas.listeners.has('webglcontextlost'), 'Must attach webglcontextlost listener');
  assert.ok(mockCanvas.listeners.has('webglcontextrestored'), 'Must attach webglcontextrestored listener');
});

test('createResilientRenderer: falls back to WebGL 1 if WebGL 2 is unavailable', () => {
  const attempts = [];
  const mockCanvas = {
    id: 'game-canvas',
    className: '',
    style: {},
    listeners: new Map(),
    addEventListener(evt, fn) {
      if (!this.listeners.has(evt)) this.listeners.set(evt, []);
      this.listeners.get(evt).push(fn);
    },
    getContext(type) {
      attempts.push(type);
      // Simulate machine where WebGL2 is completely blocked or unsupported
      if (type === 'webgl2') return null;
      if (type === 'webgl') {
        return { isMockGL: true, type: 'webgl1', getExtension() { return null; } };
      }
      return null;
    },
  };

  const mockFactory = (opts) => ({
    isMockRenderer: true,
    opts,
    getContext() { return opts.context; },
    setSize() {},
  });

  const res = createResilientRenderer(mockCanvas, {}, mockFactory);
  assert.ok(res);
  assert.ok(res.gl);
  assert.equal(res.gl.type, 'webgl1', 'Must fallback to WebGL 1 when WebGL 2 returns null');
});

test('createResilientRenderer: returns null safely on completely unavailable WebGL without throwing uncaught error', () => {
  const mockCanvas = {
    id: 'game-canvas',
    className: '',
    style: {},
    listeners: new Map(),
    addEventListener() {},
    getContext() {
      // Hardware acceleration disabled: all getContext calls return null
      return null;
    },
  };

  let res = null;
  assert.doesNotThrow(() => {
    res = createResilientRenderer(mockCanvas);
  }, 'Must not throw uncaught exception when WebGL is completely disabled');
  assert.equal(res, null, 'Must return null so client can show friendly instruction banner');
});
