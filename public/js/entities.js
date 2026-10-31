// entities.js - procedural low-poly jets, the Golden Crown, hot-air balloons,
// firework rockets and the golden ribbon contrail. Zero asset files.
import * as THREE from 'three';
import { POWERUPS } from './pilots-data.js';
import { DEFAULT_EQUIPPED } from './shop-data.js';

export const PAINT_COLORS = [
  { name: 'Coral', hex: 0xff5e5b },
  { name: 'Mango', hex: 0xffa63c },
  { name: 'Lemon', hex: 0xffe84a },
  { name: 'Mint', hex: 0x4ff0b0 },
  { name: 'Sky', hex: 0x47c8ff },
  { name: 'Violet', hex: 0x9b6bff },
  { name: 'Bubblegum', hex: 0xff6bd6 },
  { name: 'Pearl', hex: 0xf4f1ea },
];

export const BALLOON_TINTS = [0xff5e5b, 0xffa63c, 0xffe84a, 0x4ff0b0, 0x47c8ff, 0xff6bd6];

export function paintHex(index) {
  return PAINT_COLORS[((index % PAINT_COLORS.length) + PAINT_COLORS.length) % PAINT_COLORS.length].hex;
}
export function paintCss(index) {
  return '#' + paintHex(index).toString(16).padStart(6, '0');
}

// Shared geometries (built once)
const G = {};
function geo(key, build) {
  if (!G[key]) G[key] = build();
  return G[key];
}

// ---------------------------------------------------------------------------
// Jet
// ---------------------------------------------------------------------------
export class Jet {
  /**
   * @param {object} pilot  pilot definition from pilots-data.js (colors.body/wing/trail/accent)
   * @param {string} name   player name shown on the floating tag
   * @param {HTMLCanvasElement|null} portrait  optional portrait drawn next to the name
   * @param {object|null} equipped  optional equipped cosmetic item IDs
   */
  constructor(pilot, name, portrait = null, equipped = null) {
    this.group = new THREE.Group();
    this.name = name;
    this.pilot = pilot;
    this.portrait = portrait;
    this.equipped = Object.assign({}, DEFAULT_EQUIPPED, equipped || {});
    const trail = pilot.colors.trail;
    this.trailCss = '#' + trail.toString(16).padStart(6, '0');

    this.body = new THREE.Group();
    this.group.add(this.body);

    this.wingTipL = new THREE.Vector3(-6.1, 0, 2.9);
    this.wingTipR = new THREE.Vector3(6.1, 0, 2.9);

    // Contrail pools and effects
    this.voxelPool = [];
    this.ringPool = [];
    this.lightningLines = null;
    this.voxelTimer = 0;
    this.ringTimer = 0;
    this.synthOverlay = null;
    this._disposables = [];
    this.opaqueMats = [];

    this._buildAirframe();
    this.ghosted = false;

    // ----- power-up visuals -----
    // Shield Bubble: cyan translucent sphere with a wireframe cage
    this.bubble = new THREE.Group();
    this.bubbleMat = new THREE.MeshStandardMaterial({ color: 0x4ff1ff, emissive: 0x4ff1ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    this.bubble.add(new THREE.Mesh(geo('bubble', () => new THREE.SphereGeometry(8.5, 14, 10)), this.bubbleMat));
    this.bubble.add(new THREE.Mesh(geo('bubbleCage', () => new THREE.IcosahedronGeometry(8.7, 1)), new THREE.MeshBasicMaterial({ color: 0x9ffbff, wireframe: true, transparent: true, opacity: 0.35, depthWrite: false })));
    this.bubble.visible = false;
    this.group.add(this.bubble);
    // Turbo Booster: twin flame cones behind the wings
    this.turboMat = new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xff7a1a, emissiveIntensity: 3.2, transparent: true, opacity: 0.9, flatShading: true });
    this.turboFlames = new THREE.Group();
    for (const sx of [-3.2, 3.2]) {
      const f = new THREE.Mesh(geo('turboFlame', () => { const g = new THREE.ConeGeometry(0.55, 4.5, 5); g.rotateX(Math.PI / 2); return g; }), this.turboMat);
      f.position.set(sx, 0, 5.4);
      this.turboFlames.add(f);
    }
    this.turboFlames.visible = false;
    this.group.add(this.turboFlames);
    // Rapid Fire: red twin barrel glow under the nose
    this.rapidMat = new THREE.MeshStandardMaterial({ color: 0xff5e5b, emissive: 0xff5e5b, emissiveIntensity: 3.0 });
    this.rapidPods = new THREE.Group();
    for (const sx of [-1.1, 1.1]) {
      const pod = new THREE.Mesh(geo('rapidPod', () => { const g = new THREE.CylinderGeometry(0.22, 0.22, 2.2, 6); g.rotateX(Math.PI / 2); return g; }), this.rapidMat);
      pod.position.set(sx, -0.6, -3.2);
      this.rapidPods.add(pod);
    }
    this.rapidPods.visible = false;
    this.group.add(this.rapidPods);
    // Magnet: lime orbit ring around the jet
    this.magnetRing = new THREE.Mesh(geo('magnetRing', () => new THREE.TorusGeometry(9, 0.16, 6, 40)), new THREE.MeshStandardMaterial({ color: 0xb6ff3c, emissive: 0xb6ff3c, emissiveIntensity: 2.6, transparent: true, opacity: 0.8 }));
    this.magnetRing.visible = false;
    this.group.add(this.magnetRing);
    // Score x2: gold halo above the canopy
    this.x2Halo = new THREE.Mesh(geo('x2Halo', () => new THREE.TorusGeometry(1.6, 0.18, 6, 16)), new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffd54a, emissiveIntensity: 3.0 }));
    this.x2Halo.position.set(0, 2.6, -1.4);
    this.x2Halo.rotation.x = Math.PI / 2;
    this.x2Halo.visible = false;
    this.group.add(this.x2Halo);
    this.fxTimer = 0;

    // Shield shimmer shown while invulnerable after a crown steal
    this.shield = new THREE.Mesh(
      geo('shield', () => new THREE.IcosahedronGeometry(7.5, 1)),
      new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffd54a, emissiveIntensity: 1.2, transparent: true, opacity: 0.18, flatShading: true, depthWrite: false })
    );
    this.shield.visible = false;
    this.group.add(this.shield);

    // Super-charge contrail glow rings
    this.superRing = new THREE.Mesh(
      geo('superring', () => new THREE.TorusGeometry(2.2, 0.22, 6, 18)),
      new THREE.MeshStandardMaterial({ color: 0x4ff1ff, emissive: 0x4ff1ff, emissiveIntensity: 3.5 })
    );
    this.superRing.position.z = 5.2;
    this.superRing.visible = false;
    this.group.add(this.superRing);

    // Name tag (sprite from canvas): portrait + player name + pilot callsign
    this.label = makeLabel(name, this.trailCss, pilot.callsign, portrait);
    this.label.position.y = 4.6;
    this.group.add(this.label);

    // Red vs Blue team ring (set via setTeam; invisible outside team mode)
    this.teamRingMat = new THREE.MeshStandardMaterial({ color: 0xff5e5b, emissive: 0xff5e5b, emissiveIntensity: 2.2, transparent: true, opacity: 0.75 });
    this.teamRing = new THREE.Mesh(geo('teamRing', () => new THREE.TorusGeometry(9.5, 0.45, 6, 40)), this.teamRingMat);
    this.teamRing.rotation.x = Math.PI / 2;
    this.teamRing.position.y = -1.2;
    this.teamRing.visible = false;
    this.group.add(this.teamRing);

    this.exhaustTimer = 0;
    this.tumbleSpin = 0;
    this.trailColors = [new THREE.Color(0xfff2c0), new THREE.Color(trail), new THREE.Color(0x4a4458)];
  }

  _buildAirframe() {
    // 1. Remove old airframe children
    while (this.body.children.length > 0) {
      this.body.remove(this.body.children[0]);
    }
    if (this._disposables) {
      for (const d of this._disposables) if (d && d.dispose) d.dispose();
    }
    this._disposables = [];
    this.synthOverlay = null;
    this.warpRings = null;
    this.cyberSpine = null;
    this.swingWings = null;

    const finish = (this.equipped && this.equipped.finish) || 'finish_default';
    const wing = (this.equipped && this.equipped.wing) || 'wing_default';
    const fuselageChoice = (this.equipped && this.equipped.fuselage) || 'fuse_default';
    const canopyChoice = (this.equipped && this.equipped.canopy) || 'canopy_default';
    const intakeChoice = (this.equipped && this.equipped.intake) || 'intake_default';
    const nozzleChoice = (this.equipped && this.equipped.nozzle) || 'nozzle_default';
    const pilot = this.pilot;

    // Materials based on finish
    let bodyMat, wingMat, darkMat, canopyMat;

    if (finish === 'finish_gold') {
      bodyMat = new THREE.MeshStandardMaterial({
        color: 0xffcc22,
        emissive: 0x553800,
        emissiveIntensity: 0.5,
        roughness: 0.15,
        metalness: 0.92,
        flatShading: true,
      });
      wingMat = new THREE.MeshStandardMaterial({
        color: 0xffd54a,
        emissive: 0x553800,
        emissiveIntensity: 0.5,
        roughness: 0.15,
        metalness: 0.92,
        flatShading: true,
      });
      darkMat = new THREE.MeshStandardMaterial({
        color: 0x4a3610,
        roughness: 0.3,
        metalness: 0.75,
        flatShading: true,
      });
      canopyMat = new THREE.MeshStandardMaterial({
        color: 0xffea88,
        emissive: 0xffaa00,
        emissiveIntensity: 0.45,
        roughness: 0.15,
        metalness: 0.7,
        flatShading: true,
      });
    } else if (finish === 'finish_chrome') {
      bodyMat = new THREE.MeshStandardMaterial({
        color: pilot.colors.body,
        roughness: 0.08,
        metalness: 0.95,
        flatShading: true,
      });
      wingMat = new THREE.MeshStandardMaterial({
        color: pilot.colors.wing,
        roughness: 0.08,
        metalness: 0.95,
        flatShading: true,
      });
      darkMat = new THREE.MeshStandardMaterial({
        color: 0x2e2c38,
        roughness: 0.12,
        metalness: 0.88,
        flatShading: true,
      });
      canopyMat = new THREE.MeshStandardMaterial({
        color: 0x88eaff,
        emissive: 0x2a9ab8,
        emissiveIntensity: 0.4,
        roughness: 0.1,
        metalness: 0.7,
        flatShading: true,
      });
    } else if (finish === 'finish_synth') {
      bodyMat = new THREE.MeshStandardMaterial({
        color: 0x120d20,
        roughness: 0.85,
        metalness: 0.12,
        flatShading: true,
      });
      wingMat = new THREE.MeshStandardMaterial({
        color: 0x161026,
        roughness: 0.85,
        metalness: 0.12,
        flatShading: true,
      });
      darkMat = new THREE.MeshStandardMaterial({
        color: 0x090610,
        roughness: 0.9,
        metalness: 0.05,
        flatShading: true,
      });
      canopyMat = new THREE.MeshStandardMaterial({
        color: pilot.colors.accent || 0x4ff1ff,
        emissive: pilot.colors.accent || 0x4ff1ff,
        emissiveIntensity: 1.4,
        roughness: 0.2,
        flatShading: true,
      });
    } else if (finish === 'finish_holo') {
      bodyMat = new THREE.MeshStandardMaterial({
        color: pilot.colors.body,
        emissive: pilot.colors.trail,
        emissiveIntensity: 0.75,
        transparent: true,
        opacity: 0.6,
        roughness: 0.12,
        metalness: 0.35,
        depthWrite: false,
        flatShading: true,
      });
      wingMat = new THREE.MeshStandardMaterial({
        color: pilot.colors.wing,
        emissive: pilot.colors.accent || pilot.colors.trail,
        emissiveIntensity: 0.75,
        transparent: true,
        opacity: 0.6,
        roughness: 0.12,
        metalness: 0.35,
        depthWrite: false,
        flatShading: true,
      });
      darkMat = new THREE.MeshStandardMaterial({
        color: 0x3d2b5c,
        emissive: pilot.colors.trail,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        flatShading: true,
      });
      canopyMat = new THREE.MeshStandardMaterial({
        color: 0xa8f5ff,
        emissive: 0x4ff1ff,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        flatShading: true,
      });
    } else {
      // finish_default
      bodyMat = new THREE.MeshStandardMaterial({
        color: pilot.colors.body,
        roughness: 0.55,
        metalness: 0.15,
        flatShading: true,
      });
      wingMat = new THREE.MeshStandardMaterial({
        color: pilot.colors.wing,
        roughness: 0.55,
        metalness: 0.15,
        flatShading: true,
      });
      darkMat = new THREE.MeshStandardMaterial({
        color: 0x2a2438,
        roughness: 0.6,
        metalness: 0.2,
        flatShading: true,
      });
      canopyMat = new THREE.MeshStandardMaterial({
        color: 0x7fe9ff,
        emissive: 0x2a9ab8,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.4,
        flatShading: true,
      });
    }

    // Canopy cosmetic material override
    if (canopyChoice === 'canopy_amber') {
      canopyMat = new THREE.MeshStandardMaterial({
        color: 0xffb326,
        emissive: 0xcc6600,
        emissiveIntensity: 0.65,
        roughness: 0.08,
        metalness: 0.88,
        flatShading: true,
      });
    } else if (canopyChoice === 'canopy_stealth') {
      canopyMat = new THREE.MeshStandardMaterial({
        color: 0x1a1626,
        emissive: 0x483266,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.75,
        flatShading: true,
      });
    } else if (canopyChoice === 'canopy_bubble') {
      canopyMat = new THREE.MeshStandardMaterial({
        color: 0x40e0d0,
        emissive: 0x128899,
        emissiveIntensity: 0.55,
        roughness: 0.06,
        metalness: 0.45,
        transparent: true,
        opacity: 0.82,
        flatShading: true,
      });
    } else if (canopyChoice === 'canopy_cage') {
      canopyMat = new THREE.MeshStandardMaterial({
        color: 0x2aff88,
        emissive: 0x0a6630,
        emissiveIntensity: 0.5,
        roughness: 0.15,
        metalness: 0.65,
        flatShading: true,
      });
    } else if (canopyChoice === 'canopy_holo') {
      canopyMat = new THREE.MeshStandardMaterial({
        color: 0xff2a9d,
        emissive: 0xff1088,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.85,
        flatShading: true,
      });
    }

    let burnerColor = 0xffb060;
    let burnerEmissive = 0xff9a2a;
    if (nozzleChoice === 'nozzle_aerospike') {
      burnerColor = 0xcc88ff;
      burnerEmissive = 0x8833ff;
    } else if (nozzleChoice === 'nozzle_warp') {
      burnerColor = 0x88ffff;
      burnerEmissive = 0x00eeff;
    } else if (nozzleChoice === 'nozzle_vector') {
      burnerColor = 0xff8833;
      burnerEmissive = 0xff5511;
    } else if (nozzleChoice === 'nozzle_twin') {
      burnerColor = 0xff9944;
      burnerEmissive = 0xff6600;
    } else if (nozzleChoice === 'nozzle_stealth') {
      burnerColor = 0xffaa44;
      burnerEmissive = 0xff7711;
    }
    this.burnerEmissiveHex = burnerEmissive;

    this.burnerMat = new THREE.MeshStandardMaterial({
      color: burnerColor,
      emissive: burnerEmissive,
      emissiveIntensity: 2.8,
      roughness: 0.4,
      flatShading: true,
    });
    const tipMat = new THREE.MeshStandardMaterial({
      color: pilot.colors.trail,
      emissive: pilot.colors.trail,
      emissiveIntensity: 2.2,
    });

    this.bodyMat = bodyMat;
    this.wingMat = wingMat;
    this.darkMat = darkMat;
    this.canopyMat = canopyMat;
    this.tipMat = tipMat;

    this._disposables.push(bodyMat, wingMat, darkMat, canopyMat, this.burnerMat, tipMat);
    this.opaqueMats = [bodyMat, wingMat, darkMat, canopyMat, this.burnerMat, tipMat];

    const airframeParts = [];

    // Core Fuselage, Nose, Tailcone, Canopy, Afterburner
    if (fuselageChoice === 'fuse_needle') {
      // Mach-3 Needle Dart
      const fuselage = new THREE.Mesh(geo('fuse_needle_body', () => {
        const g = new THREE.CylinderGeometry(0.38, 1.2, 7.6, 8);
        g.rotateX(-Math.PI / 2);
        return g;
      }), bodyMat);
      fuselage.position.z = -0.3;
      airframeParts.push(fuselage);

      const nose = new THREE.Mesh(geo('fuse_needle_nose', () => {
        const g = new THREE.ConeGeometry(0.38, 3.8, 8);
        g.rotateX(-Math.PI / 2);
        return g;
      }), darkMat);
      nose.position.z = -5.8;
      airframeParts.push(nose);

      const probeMat = new THREE.MeshStandardMaterial({
        color: 0xe0e0e0,
        metalness: 0.95,
        roughness: 0.1,
      });
      this._disposables.push(probeMat);
      const pitotBoom = new THREE.Mesh(geo('fuse_needle_boom', () => {
        const g = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
        g.rotateX(-Math.PI / 2);
        return g;
      }), probeMat);
      pitotBoom.position.z = -8.5;
      airframeParts.push(pitotBoom);

      const dorsalSpine = new THREE.Mesh(geo('fuse_needle_spine', () => {
        const g = new THREE.BoxGeometry(0.07, 0.32, 6.2);
        return g;
      }), darkMat);
      dorsalSpine.position.set(0, 0.82, -0.5);
      airframeParts.push(dorsalSpine);

      const tailCone = new THREE.Mesh(geo('fuse_needle_tail', () => {
        const g = new THREE.CylinderGeometry(1.2, 0.95, 1.6, 8);
        g.rotateX(-Math.PI / 2);
        return g;
      }), darkMat);
      tailCone.position.z = 4.1;
      airframeParts.push(tailCone);

    } else if (fuselageChoice === 'fuse_lifting') {
      // Blended Lifting Body
      const fuselage = new THREE.Mesh(geo('fuse_lifting_body', () => {
        const g = new THREE.CylinderGeometry(0.65, 1.45, 7.5, 6);
        g.rotateX(-Math.PI / 2);
        g.scale(1.35, 0.85, 1.0);
        return g;
      }), bodyMat);
      fuselage.position.z = -0.4;
      airframeParts.push(fuselage);

      const nose = new THREE.Mesh(geo('fuse_lifting_nose', () => {
        const g = new THREE.ConeGeometry(0.65, 2.6, 6);
        g.rotateX(-Math.PI / 2);
        g.scale(1.3, 0.82, 1.0);
        return g;
      }), darkMat);
      nose.position.set(0, -0.12, -5.3);
      nose.rotation.x = -0.06;
      airframeParts.push(nose);

      const chineGeo = geo('fuse_lifting_chine', () => {
        const g = new THREE.BoxGeometry(0.55, 0.12, 4.8);
        return g;
      });
      for (const sx of [-1.22, 1.22]) {
        const chine = new THREE.Mesh(chineGeo, bodyMat);
        chine.position.set(sx, 0.05, -1.8);
        airframeParts.push(chine);
      }

      const tailCone = new THREE.Mesh(geo('fuse_lifting_tail', () => {
        const g = new THREE.CylinderGeometry(1.45, 0.95, 1.6, 6);
        g.rotateX(-Math.PI / 2);
        g.scale(1.25, 0.88, 1.0);
        return g;
      }), darkMat);
      tailCone.position.z = 4.1;
      airframeParts.push(tailCone);

    } else if (fuselageChoice === 'fuse_heavy') {
      // Armored Titanium Hull
      const fuselage = new THREE.Mesh(geo('fuse_heavy_body', () => {
        const g = new THREE.CylinderGeometry(0.9, 1.55, 7.5, 8);
        g.rotateX(-Math.PI / 2);
        return g;
      }), bodyMat);
      fuselage.position.z = -0.4;
      airframeParts.push(fuselage);

      const nose = new THREE.Mesh(geo('fuse_heavy_nose', () => {
        const g = new THREE.CylinderGeometry(0.25, 0.9, 2.2, 4);
        g.rotateX(-Math.PI / 2);
        g.rotateZ(Math.PI / 4);
        return g;
      }), darkMat);
      nose.position.z = -5.2;
      airframeParts.push(nose);

      const armorMat = new THREE.MeshStandardMaterial({
        color: 0x363442,
        metalness: 0.9,
        roughness: 0.25,
        flatShading: true,
      });
      this._disposables.push(armorMat);

      const collarZ = [-2.6, -0.4, 1.8];
      const collarR = [1.22, 1.42, 1.56];
      for (let ci = 0; ci < collarZ.length; ci++) {
        const collar = new THREE.Mesh(geo(`fuse_heavy_collar_${ci}`, () => {
          const g = new THREE.CylinderGeometry(collarR[ci], collarR[ci] * 1.02, 0.35, 8);
          g.rotateX(-Math.PI / 2);
          return g;
        }), armorMat);
        collar.position.z = collarZ[ci];
        airframeParts.push(collar);
      }

      const tailCone = new THREE.Mesh(geo('fuse_heavy_tail', () => {
        const g = new THREE.CylinderGeometry(1.55, 1.02, 1.6, 8);
        g.rotateX(-Math.PI / 2);
        return g;
      }), darkMat);
      tailCone.position.z = 4.1;
      airframeParts.push(tailCone);

    } else if (fuselageChoice === 'fuse_stealth') {
      // Faceted Diamond Stealth
      const fuselage = new THREE.Mesh(geo('fuse_stealth_body', () => {
        const g = new THREE.CylinderGeometry(0.85, 1.75, 7.6, 4);
        g.rotateX(-Math.PI / 2);
        g.rotateZ(Math.PI / 4);
        g.scale(1.4, 0.65, 1.0);
        return g;
      }), bodyMat);
      fuselage.position.z = -0.35;
      airframeParts.push(fuselage);

      const nose = new THREE.Mesh(geo('fuse_stealth_nose', () => {
        const g = new THREE.ConeGeometry(0.85, 2.8, 4);
        g.rotateX(-Math.PI / 2);
        g.rotateZ(Math.PI / 4);
        g.scale(1.35, 0.65, 1.0);
        return g;
      }), darkMat);
      nose.position.z = -5.4;
      airframeParts.push(nose);

      const chineGeo = geo('fuse_stealth_chine', () => {
        const g = new THREE.BoxGeometry(0.18, 0.06, 7.4);
        return g;
      });
      for (const sx of [-1.45, 1.45]) {
        const chine = new THREE.Mesh(chineGeo, darkMat);
        chine.position.set(sx, 0, -0.35);
        airframeParts.push(chine);
      }

      const tailCone = new THREE.Mesh(geo('fuse_stealth_tail', () => {
        const g = new THREE.CylinderGeometry(1.75, 1.0, 1.6, 4);
        g.rotateX(-Math.PI / 2);
        g.rotateZ(Math.PI / 4);
        g.scale(1.3, 0.7, 1.0);
        return g;
      }), darkMat);
      tailCone.position.z = 4.1;
      airframeParts.push(tailCone);

    } else if (fuselageChoice === 'fuse_cyber') {
      // Quantum Railframe Exoskeleton
      const fuselage = new THREE.Mesh(geo('fuse_cyber_body', () => {
        const g = new THREE.CylinderGeometry(0.5, 1.25, 7.5, 8);
        g.rotateX(-Math.PI / 2);
        return g;
      }), darkMat);
      fuselage.position.z = -0.4;
      airframeParts.push(fuselage);

      const nose = new THREE.Mesh(geo('fuse_cyber_nose', () => {
        const g = new THREE.ConeGeometry(0.5, 2.6, 8);
        g.rotateX(-Math.PI / 2);
        return g;
      }), darkMat);
      nose.position.z = -5.4;
      airframeParts.push(nose);

      const cyberSpineMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 2.8,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      this._disposables.push(cyberSpineMat);

      const spine = new THREE.Mesh(geo('fuse_cyber_spine', () => {
        const g = new THREE.BoxGeometry(0.14, 0.22, 7.6);
        return g;
      }), cyberSpineMat);
      spine.position.set(0, 0.72, -0.4);
      airframeParts.push(spine);
      this.cyberSpine = spine;

      const ribZ = [-2.4, -0.9, 0.7, 2.3];
      const ribR = [0.82, 1.02, 1.22, 1.36];
      for (let ri = 0; ri < ribZ.length; ri++) {
        const rib = new THREE.Mesh(geo(`fuse_cyber_rib_${ri}`, () => {
          const g = new THREE.TorusGeometry(ribR[ri], 0.05, 4, 16);
          return g;
        }), bodyMat);
        rib.position.set(0, 0, ribZ[ri]);
        airframeParts.push(rib);
      }

      const tailCone = new THREE.Mesh(geo('fuse_cyber_tail', () => {
        const g = new THREE.CylinderGeometry(1.25, 0.95, 1.6, 8);
        g.rotateX(-Math.PI / 2);
        return g;
      }), darkMat);
      tailCone.position.z = 4.1;
      airframeParts.push(tailCone);

    } else {
      // fuse_default: Standard Monocoque
      const fuselage = new THREE.Mesh(geo('fuselage', () => {
        const g = new THREE.CylinderGeometry(0.55, 1.35, 7.5, 6);
        g.rotateX(-Math.PI / 2);
        return g;
      }), bodyMat);
      fuselage.position.z = -0.4;
      airframeParts.push(fuselage);

      const nose = new THREE.Mesh(geo('nose', () => {
        const g = new THREE.ConeGeometry(0.55, 2.4, 6);
        g.rotateX(-Math.PI / 2);
        return g;
      }), darkMat);
      nose.position.z = -5.3;
      airframeParts.push(nose);

      const tailCone = new THREE.Mesh(geo('tailcone', () => {
        const g = new THREE.CylinderGeometry(1.35, 0.95, 1.6, 6);
        g.rotateX(-Math.PI / 2);
        return g;
      }), darkMat);
      tailCone.position.z = 4.1;
      airframeParts.push(tailCone);
    }

    if (canopyChoice === 'canopy_stealth') {
      const stealthCanopy = new THREE.Mesh(geo('canopy_stealth_mesh', () => {
        const g = new THREE.CylinderGeometry(0.18, 0.92, 3.2, 4);
        g.rotateX(-Math.PI / 2);
        g.scale(1.05, 0.72, 1.0);
        return g;
      }), canopyMat);
      stealthCanopy.position.set(0, 0.82, -1.4);
      airframeParts.push(stealthCanopy);

      const stealthRidge = new THREE.Mesh(geo('canopy_stealth_ridge', () => {
        const g = new THREE.BoxGeometry(0.06, 0.12, 3.1);
        return g;
      }), darkMat);
      stealthRidge.position.set(0, 1.28, -1.4);
      airframeParts.push(stealthRidge);
    } else if (canopyChoice === 'canopy_bubble') {
      const bubbleCanopy = new THREE.Mesh(geo('canopy_bubble_mesh', () => {
        const g = new THREE.SphereGeometry(1.06, 10, 8);
        g.scale(0.95, 0.95, 1.5);
        return g;
      }), canopyMat);
      bubbleCanopy.position.set(0, 0.96, -1.4);
      airframeParts.push(bubbleCanopy);

      const bubbleCollar = new THREE.Mesh(geo('canopy_bubble_collar', () => {
        const g = new THREE.TorusGeometry(1.0, 0.05, 4, 16);
        g.rotateX(Math.PI / 2);
        g.scale(0.95, 1.48, 1.0);
        return g;
      }), darkMat);
      bubbleCollar.position.set(0, 0.65, -1.4);
      airframeParts.push(bubbleCollar);
    } else if (canopyChoice === 'canopy_cage') {
      const cageGlass = new THREE.Mesh(geo('canopy_cage_glass', () => {
        const g = new THREE.SphereGeometry(0.9, 8, 6);
        g.scale(0.8, 0.85, 1.8);
        return g;
      }), canopyMat);
      cageGlass.position.set(0, 0.85, -1.4);
      airframeParts.push(cageGlass);

      const ribZ = [-0.65, -1.4, -2.15];
      for (let ri = 0; ri < ribZ.length; ri++) {
        const rib = new THREE.Mesh(geo(`canopy_cage_rib_${ri}`, () => {
          const g = new THREE.TorusGeometry(0.78, 0.055, 4, 10, Math.PI);
          return g;
        }), darkMat);
        rib.position.set(0, 0.72, ribZ[ri]);
        airframeParts.push(rib);
      }

      const cageSpine = new THREE.Mesh(geo('canopy_cage_spine', () => {
        const g = new THREE.BoxGeometry(0.08, 0.08, 2.7);
        return g;
      }), darkMat);
      cageSpine.position.set(0, 1.54, -1.4);
      airframeParts.push(cageSpine);
    } else if (canopyChoice === 'canopy_holo') {
      const holoGlass = new THREE.Mesh(geo('canopy_holo_glass', () => {
        const g = new THREE.SphereGeometry(0.9, 8, 6);
        g.scale(0.8, 0.8, 1.8);
        return g;
      }), canopyMat);
      holoGlass.position.set(0, 0.85, -1.4);
      airframeParts.push(holoGlass);

      const hudReticleMat = new THREE.MeshStandardMaterial({
        color: 0x4ff1ff,
        emissive: 0x4ff1ff,
        emissiveIntensity: 2.8,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      this._disposables.push(hudReticleMat);

      const hudRing = new THREE.Mesh(geo('canopy_hud_ring', () => {
        const g = new THREE.TorusGeometry(0.26, 0.025, 4, 12);
        return g;
      }), hudReticleMat);
      hudRing.position.set(0, 0.92, -2.15);
      airframeParts.push(hudRing);

      const hudCross = new THREE.Mesh(geo('canopy_hud_cross', () => {
        const g = new THREE.BoxGeometry(0.42, 0.02, 0.02);
        return g;
      }), hudReticleMat);
      hudCross.position.set(0, 0.92, -2.15);
      airframeParts.push(hudCross);
    } else if (canopyChoice === 'canopy_amber') {
      const amberCanopy = new THREE.Mesh(geo('canopy_amber_glass', () => {
        const g = new THREE.SphereGeometry(0.92, 8, 6);
        g.scale(0.82, 0.78, 1.9);
        return g;
      }), canopyMat);
      amberCanopy.position.set(0, 0.82, -1.4);
      airframeParts.push(amberCanopy);

      const browMat = new THREE.MeshStandardMaterial({
        color: 0xffd54a,
        emissive: 0xaa7700,
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.2,
      });
      this._disposables.push(browMat);

      const amberBrow = new THREE.Mesh(geo('canopy_amber_brow', () => {
        const g = new THREE.TorusGeometry(0.72, 0.045, 4, 12, Math.PI);
        return g;
      }), browMat);
      amberBrow.position.set(0, 0.68, -2.2);
      airframeParts.push(amberBrow);
    } else {
      const canopy = new THREE.Mesh(geo('canopy', () => {
        const g = new THREE.SphereGeometry(0.9, 8, 6);
        g.scale(0.8, 0.8, 1.8);
        return g;
      }), canopyMat);
      canopy.position.set(0, 0.85, -1.4);
      airframeParts.push(canopy);
    }

    // Engine Exhaust Nozzle & Afterburner
    if (nozzleChoice === 'nozzle_vector') {
      // 3D Thrust-Vectoring Paddles
      const collar = new THREE.Mesh(geo('nozzle_vector_cowl', () => {
        const g = new THREE.CylinderGeometry(0.92, 0.96, 0.5, 6);
        g.rotateX(Math.PI / 2);
        return g;
      }), bodyMat);
      collar.position.set(0, 0, 4.95);
      airframeParts.push(collar);

      const throat = new THREE.Mesh(geo('nozzle_vector_throat', () => {
        const g = new THREE.CylinderGeometry(0.82, 0.82, 0.4, 8);
        g.rotateX(Math.PI / 2);
        return g;
      }), darkMat);
      throat.position.set(0, 0, 5.0);
      airframeParts.push(throat);

      const paddleTBGeo = geo('nozzle_vector_paddle_tb', () => {
        const g = new THREE.BoxGeometry(0.68, 0.08, 0.65);
        return g;
      });
      const paddleLRGeo = geo('nozzle_vector_paddle_lr', () => {
        const g = new THREE.BoxGeometry(0.08, 0.68, 0.65);
        return g;
      });

      const topPaddle = new THREE.Mesh(paddleTBGeo, darkMat);
      topPaddle.position.set(0, 0.94, 5.25);
      topPaddle.rotation.x = -0.15;
      const botPaddle = new THREE.Mesh(paddleTBGeo, darkMat);
      botPaddle.position.set(0, -0.94, 5.25);
      botPaddle.rotation.x = 0.15;

      const leftPaddle = new THREE.Mesh(paddleLRGeo, darkMat);
      leftPaddle.position.set(-0.94, 0, 5.25);
      leftPaddle.rotation.y = 0.15;
      const rightPaddle = new THREE.Mesh(paddleLRGeo, darkMat);
      rightPaddle.position.set(0.94, 0, 5.25);
      rightPaddle.rotation.y = -0.15;

      airframeParts.push(topPaddle, botPaddle, leftPaddle, rightPaddle);

      this.burner = new THREE.Mesh(geo('burner', () => {
        const g = new THREE.ConeGeometry(0.8, 3.0, 6);
        g.rotateX(Math.PI / 2);
        return g;
      }), this.burnerMat);
      this.burner.position.z = 5.6;
      airframeParts.push(this.burner);

    } else if (nozzleChoice === 'nozzle_twin') {
      // Dual Twin-Afterburner Pods
      const fairingBridge = new THREE.Mesh(geo('nozzle_twin_bridge', () => {
        const g = new THREE.BoxGeometry(1.85, 0.85, 0.9);
        return g;
      }), bodyMat);
      fairingBridge.position.set(0, 0, 4.45);
      airframeParts.push(fairingBridge);

      for (const sx of [-0.62, 0.62]) {
        const cowl = new THREE.Mesh(geo('nozzle_twin_cowl', () => {
          const g = new THREE.CylinderGeometry(0.48, 0.52, 0.9, 8);
          g.rotateX(Math.PI / 2);
          return g;
        }), bodyMat);
        cowl.position.set(sx, 0, 4.95);
        airframeParts.push(cowl);

        const innerNozzle = new THREE.Mesh(geo('nozzle_twin_inner', () => {
          const g = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 8);
          g.rotateX(Math.PI / 2);
          return g;
        }), darkMat);
        innerNozzle.position.set(sx, 0, 5.2);
        airframeParts.push(innerNozzle);
      }

      const twinBurnerGroup = new THREE.Group();
      twinBurnerGroup.position.z = 5.6;
      const twinFlameGeo = geo('burner_twin_flame', () => {
        const g = new THREE.ConeGeometry(0.44, 2.8, 6);
        g.rotateX(Math.PI / 2);
        return g;
      });
      const leftFlame = new THREE.Mesh(twinFlameGeo, this.burnerMat);
      leftFlame.position.x = -0.62;
      const rightFlame = new THREE.Mesh(twinFlameGeo, this.burnerMat);
      rightFlame.position.x = 0.62;
      twinBurnerGroup.add(leftFlame, rightFlame);

      this.burner = twinBurnerGroup;
      airframeParts.push(this.burner);

    } else if (nozzleChoice === 'nozzle_aerospike') {
      // Linear Aerospike Torus with center plug cone
      const outerCowl = new THREE.Mesh(geo('nozzle_aerospike_cowl', () => {
        const g = new THREE.CylinderGeometry(0.96, 1.0, 0.55, 10);
        g.rotateX(Math.PI / 2);
        return g;
      }), bodyMat);
      outerCowl.position.set(0, 0, 4.95);
      airframeParts.push(outerCowl);

      const annularThroat = new THREE.Mesh(geo('nozzle_aerospike_throat', () => {
        const g = new THREE.CylinderGeometry(0.85, 0.85, 0.3, 10);
        g.rotateX(Math.PI / 2);
        return g;
      }), darkMat);
      annularThroat.position.set(0, 0, 5.0);
      airframeParts.push(annularThroat);

      const aerospikeRingMat = new THREE.MeshStandardMaterial({
        color: 0xaa44ff,
        emissive: 0xaa22ff,
        emissiveIntensity: 2.6,
        transparent: true,
        opacity: 0.9,
      });
      this._disposables.push(aerospikeRingMat);

      const plasmaRing = new THREE.Mesh(geo('nozzle_aerospike_ring', () => {
        const g = new THREE.TorusGeometry(0.72, 0.05, 6, 16);
        return g;
      }), aerospikeRingMat);
      plasmaRing.position.set(0, 0, 5.05);
      airframeParts.push(plasmaRing);

      const centerPlug = new THREE.Mesh(geo('nozzle_aerospike_plug', () => {
        const g = new THREE.ConeGeometry(0.38, 1.7, 8);
        g.rotateX(Math.PI / 2);
        return g;
      }), darkMat);
      centerPlug.position.set(0, 0, 5.75);
      airframeParts.push(centerPlug);

      this.burner = new THREE.Mesh(geo('burner_aerospike', () => {
        const g = new THREE.ConeGeometry(0.74, 2.9, 8);
        g.rotateX(Math.PI / 2);
        return g;
      }), this.burnerMat);
      this.burner.position.z = 5.8;
      airframeParts.push(this.burner);

    } else if (nozzleChoice === 'nozzle_stealth') {
      // Serrated Stealth Chevrons
      const shroud = new THREE.Mesh(geo('nozzle_stealth_shroud', () => {
        const g = new THREE.CylinderGeometry(0.88, 0.98, 0.65, 8);
        g.rotateX(Math.PI / 2);
        return g;
      }), darkMat);
      shroud.position.set(0, 0, 4.95);
      airframeParts.push(shroud);

      // Serrated 8-point chevron ring
      const chevronMesh = new THREE.Mesh(geo('nozzle_stealth_chevrons', () => {
        const shape = new THREE.Shape();
        const chevrons = 8;
        const rOuter = 0.94;
        const rNotch = 0.78;
        for (let i = 0; i < chevrons * 2; i++) {
          const theta = (i / (chevrons * 2)) * Math.PI * 2;
          const r = (i % 2 === 0) ? rOuter : rNotch;
          const x = Math.cos(theta) * r;
          const y = Math.sin(theta) * r;
          if (i === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        }
        shape.closePath();
        const hole = new THREE.Path();
        const rHole = 0.65;
        for (let i = 0; i < 16; i++) {
          const theta = (i / 16) * Math.PI * 2;
          const x = Math.cos(theta) * rHole;
          const y = Math.sin(theta) * rHole;
          if (i === 0) hole.moveTo(x, y);
          else hole.lineTo(x, y);
        }
        hole.closePath();
        shape.holes.push(hole);
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false });
        return g;
      }), darkMat);
      chevronMesh.position.set(0, 0, 5.05);
      airframeParts.push(chevronMesh);

      const goldLinerMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0x664400,
        emissiveIntensity: 0.8,
        metalness: 0.95,
        roughness: 0.15,
      });
      this._disposables.push(goldLinerMat);

      const goldLiner = new THREE.Mesh(geo('nozzle_stealth_gold_liner', () => {
        const g = new THREE.TorusGeometry(0.66, 0.045, 4, 16);
        return g;
      }), goldLinerMat);
      goldLiner.position.set(0, 0, 5.08);
      airframeParts.push(goldLiner);

      this.burner = new THREE.Mesh(geo('burner', () => {
        const g = new THREE.ConeGeometry(0.8, 3.0, 6);
        g.rotateX(Math.PI / 2);
        return g;
      }), this.burnerMat);
      this.burner.position.z = 5.6;
      airframeParts.push(this.burner);

    } else if (nozzleChoice === 'nozzle_warp') {
      // Hyperdrive Singularity Ring
      const shroud = new THREE.Mesh(geo('nozzle_warp_shroud', () => {
        const g = new THREE.CylinderGeometry(0.92, 0.96, 0.5, 8);
        g.rotateX(Math.PI / 2);
        return g;
      }), bodyMat);
      shroud.position.set(0, 0, 4.95);
      airframeParts.push(shroud);

      const voidCore = new THREE.Mesh(geo('nozzle_warp_void', () => {
        const g = new THREE.CylinderGeometry(0.72, 0.72, 0.4, 8);
        g.rotateX(Math.PI / 2);
        return g;
      }), darkMat);
      voidCore.position.set(0, 0, 5.0);
      airframeParts.push(voidCore);

      const warpCyanMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 3.0,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const warpMagentaMat = new THREE.MeshStandardMaterial({
        color: 0xcc22ff,
        emissive: 0xcc22ff,
        emissiveIntensity: 3.0,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      this._disposables.push(warpCyanMat, warpMagentaMat);

      const ring1 = new THREE.Mesh(geo('nozzle_warp_ring1', () => {
        const g = new THREE.TorusGeometry(0.82, 0.045, 6, 20);
        return g;
      }), warpCyanMat);
      ring1.position.set(0, 0, 5.15);

      const ring2 = new THREE.Mesh(geo('nozzle_warp_ring2', () => {
        const g = new THREE.TorusGeometry(0.68, 0.04, 6, 20);
        return g;
      }), warpMagentaMat);
      ring2.position.set(0, 0, 5.45);

      const ring3 = new THREE.Mesh(geo('nozzle_warp_ring3', () => {
        const g = new THREE.TorusGeometry(0.52, 0.035, 6, 20);
        return g;
      }), warpCyanMat);
      ring3.position.set(0, 0, 5.75);

      this.warpRings = [ring1, ring2, ring3];
      airframeParts.push(ring1, ring2, ring3);

      // 4 Magnetic containment pylons
      const pylonGeo = geo('nozzle_warp_pylon', () => {
        const g = new THREE.BoxGeometry(0.06, 0.06, 1.0);
        return g;
      });
      for (const [px, py] of [[0, 0.88], [0, -0.88], [0.88, 0], [-0.88, 0]]) {
        const pylon = new THREE.Mesh(pylonGeo, darkMat);
        pylon.position.set(px, py, 5.35);
        airframeParts.push(pylon);
      }

      this.burner = new THREE.Mesh(geo('burner_warp', () => {
        const g = new THREE.ConeGeometry(0.55, 2.6, 8);
        g.rotateX(Math.PI / 2);
        return g;
      }), this.burnerMat);
      this.burner.position.z = 5.8;
      airframeParts.push(this.burner);

    } else {
      // nozzle_default: Titanium Iris Petals
      const collar = new THREE.Mesh(geo('nozzle_iris_collar', () => {
        const g = new THREE.CylinderGeometry(0.96, 0.98, 0.25, 12);
        g.rotateX(Math.PI / 2);
        return g;
      }), darkMat);
      collar.position.set(0, 0, 4.8);
      airframeParts.push(collar);

      const petals = new THREE.Mesh(geo('nozzle_iris_petals', () => {
        const g = new THREE.CylinderGeometry(0.84, 0.94, 0.42, 12);
        g.rotateX(Math.PI / 2);
        return g;
      }), darkMat);
      petals.position.set(0, 0, 5.08);
      airframeParts.push(petals);

      const throatMat = new THREE.MeshStandardMaterial({
        color: 0xff6622,
        emissive: 0xff4400,
        emissiveIntensity: 1.8,
        roughness: 0.3,
      });
      this._disposables.push(throatMat);

      const throat = new THREE.Mesh(geo('nozzle_iris_throat', () => {
        const g = new THREE.TorusGeometry(0.76, 0.045, 4, 12);
        return g;
      }), throatMat);
      throat.position.set(0, 0, 4.9);
      airframeParts.push(throat);

      this.burner = new THREE.Mesh(geo('burner', () => {
        const g = new THREE.ConeGeometry(0.8, 3.0, 6);
        g.rotateX(Math.PI / 2);
        return g;
      }), this.burnerMat);
      this.burner.position.z = 5.6;
      airframeParts.push(this.burner);
    }

    // Engine Air Intakes
    if (intakeChoice === 'intake_ramjet') {
      // SR-71 Supersonic Conical Shock-Spike Nacelles
      for (const sx of [-1.45, 1.45]) {
        const nacelle = new THREE.Mesh(geo('intake_ramjet_cowl', () => {
          const g = new THREE.CylinderGeometry(0.48, 0.54, 2.5, 8);
          g.rotateX(Math.PI / 2);
          return g;
        }), bodyMat);
        nacelle.position.set(sx, 0.05, -0.5);
        airframeParts.push(nacelle);

        const mouth = new THREE.Mesh(geo('intake_ramjet_mouth', () => {
          const g = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 8);
          g.rotateX(Math.PI / 2);
          return g;
        }), darkMat);
        mouth.position.set(sx, 0.05, -1.74);
        airframeParts.push(mouth);

        const spike = new THREE.Mesh(geo('intake_ramjet_spike', () => {
          const g = new THREE.ConeGeometry(0.24, 1.35, 8);
          g.rotateX(-Math.PI / 2);
          return g;
        }), darkMat);
        spike.position.set(sx, 0.05, -2.15);
        airframeParts.push(spike);
      }
    } else if (intakeChoice === 'intake_viper') {
      // Viper Wide Ventral Belly Scoop with Chin Splitter Shelf
      const ventralDuct = new THREE.Mesh(geo('intake_viper_duct', () => {
        const g = new THREE.BoxGeometry(1.55, 0.75, 2.8);
        return g;
      }), bodyMat);
      ventralDuct.position.set(0, -0.85, -0.9);
      airframeParts.push(ventralDuct);

      const ventralMouth = new THREE.Mesh(geo('intake_viper_mouth', () => {
        const g = new THREE.BoxGeometry(1.38, 0.58, 0.25);
        return g;
      }), darkMat);
      ventralMouth.position.set(0, -0.85, -2.3);
      airframeParts.push(ventralMouth);

      const ventralSplitter = new THREE.Mesh(geo('intake_viper_splitter', () => {
        const g = new THREE.BoxGeometry(0.12, 0.65, 0.35);
        return g;
      }), darkMat);
      ventralSplitter.position.set(0, -0.85, -2.3);
      airframeParts.push(ventralSplitter);

      const chinShelf = new THREE.Mesh(geo('intake_viper_shelf', () => {
        const g = new THREE.BoxGeometry(1.4, 0.1, 1.8);
        return g;
      }), darkMat);
      chinShelf.position.set(0, -0.46, -1.8);
      airframeParts.push(chinShelf);
    } else if (intakeChoice === 'intake_splitters') {
      // Flanker Canted DSI Bumpers with Boundary Layer Splitter Plates
      for (const sx of [-1.4, 1.4]) {
        const sign = sx > 0 ? 1 : -1;
        const box = new THREE.Mesh(geo('intake_dsi_box', () => {
          const g = new THREE.BoxGeometry(0.72, 0.75, 2.6);
          return g;
        }), bodyMat);
        box.position.set(sx, -0.12, -0.5);
        box.rotation.z = -sign * 0.16;
        airframeParts.push(box);

        const mouth = new THREE.Mesh(geo('intake_dsi_mouth', () => {
          const g = new THREE.BoxGeometry(0.58, 0.6, 0.25);
          return g;
        }), darkMat);
        mouth.position.set(sx, -0.12, -1.8);
        mouth.rotation.z = -sign * 0.16;
        airframeParts.push(mouth);

        const splitter = new THREE.Mesh(geo('intake_dsi_splitter', () => {
          const g = new THREE.BoxGeometry(0.08, 0.92, 2.2);
          return g;
        }), darkMat);
        splitter.position.set(sx - sign * 0.44, -0.08, -1.1);
        airframeParts.push(splitter);
      }
    } else if (intakeChoice === 'intake_turbine') {
      // Titanium Fan Turbines with Visible Spinning Blades
      const fanMat = new THREE.MeshStandardMaterial({
        color: 0xd8d8d8,
        metalness: 0.95,
        roughness: 0.15,
        flatShading: true,
      });
      const coneMat = new THREE.MeshStandardMaterial({
        color: 0xffd54a,
        emissive: 0x996600,
        emissiveIntensity: 0.5,
        metalness: 0.9,
        roughness: 0.2,
      });
      this._disposables.push(fanMat, coneMat);

      for (const sx of [-1.45, 1.45]) {
        const cowl = new THREE.Mesh(geo('intake_turbine_cowl', () => {
          const g = new THREE.CylinderGeometry(0.54, 0.56, 2.4, 10);
          g.rotateX(Math.PI / 2);
          return g;
        }), bodyMat);
        cowl.position.set(sx, 0.05, -0.5);
        airframeParts.push(cowl);

        const mouth = new THREE.Mesh(geo('intake_turbine_mouth', () => {
          const g = new THREE.CylinderGeometry(0.46, 0.46, 0.2, 10);
          g.rotateX(Math.PI / 2);
          return g;
        }), darkMat);
        mouth.position.set(sx, 0.05, -1.7);
        airframeParts.push(mouth);

        const fanDisk = new THREE.Mesh(geo('intake_turbine_disk', () => {
          const g = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 12);
          g.rotateX(Math.PI / 2);
          return g;
        }), fanMat);
        fanDisk.position.set(sx, 0.05, -1.54);
        airframeParts.push(fanDisk);

        const noseCone = new THREE.Mesh(geo('intake_turbine_cone', () => {
          const g = new THREE.ConeGeometry(0.12, 0.35, 8);
          g.rotateX(-Math.PI / 2);
          return g;
        }), coneMat);
        noseCone.position.set(sx, 0.05, -1.68);
        airframeParts.push(noseCone);
      }
    } else if (intakeChoice === 'intake_plasma') {
      // Quantum Plasma Ram-Scoops with Glowing Ion Rings
      const plasmaMat = new THREE.MeshStandardMaterial({
        color: 0x4ff1ff,
        emissive: 0x4ff1ff,
        emissiveIntensity: 2.8,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      this._disposables.push(plasmaMat);

      for (const sx of [-1.4, 1.4]) {
        const cowl = new THREE.Mesh(geo('intake_plasma_cowl', () => {
          const g = new THREE.BoxGeometry(0.68, 0.65, 2.5);
          return g;
        }), bodyMat);
        cowl.position.set(sx, 0.05, -0.5);
        airframeParts.push(cowl);

        const core = new THREE.Mesh(geo('intake_plasma_core', () => {
          const g = new THREE.BoxGeometry(0.52, 0.5, 0.2);
          return g;
        }), darkMat);
        core.position.set(sx, 0.05, -1.75);
        airframeParts.push(core);

        const ionRing = new THREE.Mesh(geo('intake_plasma_ring', () => {
          const g = new THREE.TorusGeometry(0.36, 0.045, 6, 16);
          return g;
        }), plasmaMat);
        ionRing.position.set(sx, 0.05, -1.9);
        airframeParts.push(ionRing);
      }
    } else {
      // intake_default: Classic Twin Lateral Wedge Scoops
      for (const sx of [-1.35, 1.35]) {
        const sign = sx > 0 ? 1 : -1;
        const duct = new THREE.Mesh(geo('intake_wedge_duct', () => {
          const g = new THREE.BoxGeometry(0.65, 0.7, 2.4);
          return g;
        }), bodyMat);
        duct.position.set(sx, 0.05, -0.6);
        duct.rotation.z = -sign * 0.06;
        airframeParts.push(duct);

        const mouth = new THREE.Mesh(geo('intake_wedge_mouth', () => {
          const g = new THREE.BoxGeometry(0.52, 0.56, 0.2);
          return g;
        }), darkMat);
        mouth.position.set(sx, 0.05, -1.8);
        mouth.rotation.z = -sign * 0.06;
        airframeParts.push(mouth);

        const lip = new THREE.Mesh(geo('intake_wedge_lip', () => {
          const g = new THREE.BoxGeometry(0.67, 0.1, 0.35);
          return g;
        }), darkMat);
        lip.position.set(sx, 0.4, -1.75);
        lip.rotation.z = -sign * 0.06;
        airframeParts.push(lip);
      }
    }

    // Tip lights helper
    const makeTip = (pos) => {
      const tip = new THREE.Mesh(geo('tip', () => new THREE.SphereGeometry(0.28, 6, 4)), tipMat);
      tip.position.copy(pos);
      return tip;
    };

    // Wings & Tail variants
    if (wing === 'wing_xwing') {
      // Forward swept wings
      const xwing = new THREE.Mesh(geo('wing_xwing_main', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 2.6);
        shape.lineTo(6.3, -0.6);
        shape.lineTo(6.3, 0.6);
        shape.lineTo(0, 3.6);
        shape.lineTo(-6.3, 0.6);
        shape.lineTo(-6.3, -0.6);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, -0.15, 0);
        return g;
      }), wingMat);
      airframeParts.push(xwing);

      // Front canards
      const canards = new THREE.Mesh(geo('wing_xwing_canards', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.2);
        shape.lineTo(2.5, 0.8);
        shape.lineTo(2.5, 1.4);
        shape.lineTo(0, 0.8);
        shape.lineTo(-2.5, 1.4);
        shape.lineTo(-2.5, 0.8);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, 0.1, -3.2);
        return g;
      }), wingMat);
      airframeParts.push(canards);

      // Vertical fin
      const vfin = new THREE.Mesh(geo('vfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.6, 0);
        shape.lineTo(2.2, 2.6);
        shape.lineTo(1.2, 2.6);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
        g.rotateY(-Math.PI / 2);
        g.translate(0.15, 0.6, 1.4);
        return g;
      }), bodyMat);
      airframeParts.push(vfin);

      this.wingTipL.set(-6.3, 0, 0);
      this.wingTipR.set(6.3, 0, 0);
      airframeParts.push(makeTip(this.wingTipL), makeTip(this.wingTipR));

    } else if (wing === 'wing_triplane') {
      // 3 stacked wing decks linked by vertical cylinder struts
      const botDeck = new THREE.Mesh(geo('triplane_bot', () => new THREE.BoxGeometry(11.6, 0.22, 2.4)), wingMat);
      botDeck.position.set(0, -0.55, 0.8);
      const midDeck = new THREE.Mesh(geo('triplane_mid', () => new THREE.BoxGeometry(11.2, 0.22, 2.4)), wingMat);
      midDeck.position.set(0, 0.25, 0.6);
      const topDeck = new THREE.Mesh(geo('triplane_top', () => new THREE.BoxGeometry(12.0, 0.22, 2.5)), wingMat);
      topDeck.position.set(0, 1.05, 0.4);
      airframeParts.push(botDeck, midDeck, topDeck);

      // Connecting struts
      const strutGeo = geo('triplane_strut', () => new THREE.CylinderGeometry(0.08, 0.08, 1.7, 6));
      for (const sx of [-4.5, -2.5, 2.5, 4.5]) {
        for (const sz of [0.2, 1.0]) {
          const strut = new THREE.Mesh(strutGeo, darkMat);
          strut.position.set(sx, 0.25, sz);
          airframeParts.push(strut);
        }
      }

      // Classic rudder + elevator
      const vfin = new THREE.Mesh(geo('vfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.6, 0);
        shape.lineTo(2.2, 2.6);
        shape.lineTo(1.2, 2.6);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
        g.rotateY(-Math.PI / 2);
        g.translate(0.15, 0.6, 1.4);
        return g;
      }), bodyMat);
      const hfin = new THREE.Mesh(geo('hfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.6, 1.3);
        shape.lineTo(2.6, 2.0);
        shape.lineTo(0, 1.4);
        shape.lineTo(-2.6, 2.0);
        shape.lineTo(-2.6, 1.3);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, 0.3, 2.2);
        return g;
      }), darkMat);
      airframeParts.push(vfin, hfin);

      this.wingTipL.set(-6.0, 1.05, 0.4);
      this.wingTipR.set(6.0, 1.05, 0.4);
      airframeParts.push(makeTip(this.wingTipL), makeTip(this.wingTipR));

    } else if (wing === 'wing_twinboom') {
      // Main wing deck
      const wingDeck = new THREE.Mesh(geo('twinboom_wing', () => new THREE.BoxGeometry(12.8, 0.32, 2.6)), wingMat);
      wingDeck.position.set(0, 0, 1.0);
      airframeParts.push(wingDeck);

      // Dual tail booms
      const boomGeo = geo('twinboom_boom', () => {
        const g = new THREE.CylinderGeometry(0.32, 0.24, 7.2, 6);
        g.rotateX(-Math.PI / 2);
        return g;
      });
      const boomL = new THREE.Mesh(boomGeo, darkMat);
      boomL.position.set(-2.7, 0.1, 3.6);
      const boomR = new THREE.Mesh(boomGeo, darkMat);
      boomR.position.set(2.7, 0.1, 3.6);
      airframeParts.push(boomL, boomR);

      // Twin vertical fins
      const twinFinGeo = geo('twinboom_fin', () => new THREE.BoxGeometry(0.25, 2.0, 1.8));
      const finL = new THREE.Mesh(twinFinGeo, bodyMat);
      finL.position.set(-2.7, 1.1, 7.0);
      const finR = new THREE.Mesh(twinFinGeo, bodyMat);
      finR.position.set(2.7, 1.1, 7.0);
      airframeParts.push(finL, finR);

      // High bridging stabilizer
      const bridge = new THREE.Mesh(geo('twinboom_bridge', () => new THREE.BoxGeometry(5.8, 0.22, 1.5)), darkMat);
      bridge.position.set(0, 1.9, 7.0);
      airframeParts.push(bridge);

      this.wingTipL.set(-6.4, 0, 1.0);
      this.wingTipR.set(6.4, 0, 1.0);
      airframeParts.push(makeTip(this.wingTipL), makeTip(this.wingTipR));

    } else if (wing === 'wing_saucer') {
      // Flattened saucer disc
      const saucerDisc = new THREE.Mesh(geo('saucer_disc', () => new THREE.CylinderGeometry(5.6, 5.6, 0.65, 24)), wingMat);
      saucerDisc.position.set(0, -0.1, -0.4);
      airframeParts.push(saucerDisc);

      // Saucer outer torus ring
      const saucerRim = new THREE.Mesh(geo('saucer_rim', () => {
        const g = new THREE.TorusGeometry(5.6, 0.45, 8, 32);
        g.rotateX(Math.PI / 2);
        return g;
      }), darkMat);
      saucerRim.position.set(0, -0.1, -0.4);
      airframeParts.push(saucerRim);

      // Glowing rim node segments
      const nodeGeo = geo('saucer_node', () => new THREE.SphereGeometry(0.34, 6, 4));
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const node = new THREE.Mesh(nodeGeo, tipMat);
        node.position.set(Math.cos(ang) * 5.6, -0.1, -0.4 + Math.sin(ang) * 5.6);
        airframeParts.push(node);
      }

      // Subtle dorsal stabilizer
      const dorsal = new THREE.Mesh(geo('saucer_dorsal', () => new THREE.BoxGeometry(0.25, 1.4, 2.2)), bodyMat);
      dorsal.position.set(0, 0.9, 2.2);
      airframeParts.push(dorsal);

      this.wingTipL.set(-5.8, -0.1, -0.4);
      this.wingTipR.set(5.8, -0.1, -0.4);
      airframeParts.push(makeTip(this.wingTipL), makeTip(this.wingTipR));

    } else if (wing === 'wing_eurofighter') {
      // Eurofighter Typhoon: Cropped Delta + Foreplane Canards + Tall Fin with ECM Pod
      const euroWing = new THREE.Mesh(geo('wing_euro_main', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.6);
        shape.lineTo(6.4, 2.4);
        shape.lineTo(6.4, 3.4);
        shape.lineTo(0, 3.4);
        shape.lineTo(-6.4, 3.4);
        shape.lineTo(-6.4, 2.4);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, -0.15, 0);
        return g;
      }), wingMat);
      airframeParts.push(euroWing);

      // Tip pods / ECM missile rails
      const podGeo = geo('wing_euro_tip_pod', () => {
        const g = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6);
        g.rotateX(-Math.PI / 2);
        return g;
      });
      for (const sx of [-6.4, 6.4]) {
        const pod = new THREE.Mesh(podGeo, darkMat);
        pod.position.set(sx, -0.15, 2.9);
        airframeParts.push(pod);
      }

      // Foreplane All-Moving Canards ahead of cockpit
      const euroCanard = new THREE.Mesh(geo('wing_euro_canards', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.4, 0.7);
        shape.lineTo(2.4, 1.25);
        shape.lineTo(0, 0.7);
        shape.lineTo(-2.4, 1.25);
        shape.lineTo(-2.4, 0.7);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, 0.25, -2.8);
        return g;
      }), wingMat);
      airframeParts.push(euroCanard);

      // Tall Typhoon Vertical Fin with top ECM pod
      const vfin = new THREE.Mesh(geo('wing_euro_vfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.4, 0);
        shape.lineTo(1.8, 2.9);
        shape.lineTo(0.9, 2.9);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.28, bevelEnabled: false });
        g.rotateY(-Math.PI / 2);
        g.translate(0.14, 0.6, 1.4);
        return g;
      }), bodyMat);
      airframeParts.push(vfin);

      const finPod = new THREE.Mesh(geo('wing_euro_fin_pod', () => {
        const g = new THREE.CylinderGeometry(0.12, 0.1, 1.2, 6);
        g.rotateX(-Math.PI / 2);
        return g;
      }), darkMat);
      finPod.position.set(0, 3.5, 2.5);
      airframeParts.push(finPod);

      this.wingTipL.set(-6.4, -0.15, 2.9);
      this.wingTipR.set(6.4, -0.15, 2.9);
      airframeParts.push(makeTip(this.wingTipL), makeTip(this.wingTipR));

    } else if (wing === 'wing_f14') {
      // F-14 Tomcat: Variable-Geometry Swing Wings + Twin Canted Fins + Stabilators
      const glove = new THREE.Mesh(geo('wing_f14_glove', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, -1.2);
        shape.lineTo(2.2, 1.8);
        shape.lineTo(2.2, 3.4);
        shape.lineTo(0, 3.4);
        shape.lineTo(-2.2, 3.4);
        shape.lineTo(-2.2, 1.8);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.38, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, -0.12, 0);
        return g;
      }), wingMat);
      airframeParts.push(glove);

      const twinFinGeo = geo('wing_f14_vfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.2, 0);
        shape.lineTo(1.6, 2.7);
        shape.lineTo(0.8, 2.7);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
        g.rotateY(-Math.PI / 2);
        return g;
      });
      for (const sx of [-1.55, 1.55]) {
        const sign = sx > 0 ? 1 : -1;
        const vfin = new THREE.Mesh(twinFinGeo, bodyMat);
        vfin.position.set(sx, 0.55, 2.2);
        vfin.rotation.z = -sign * 0.08;
        airframeParts.push(vfin);
      }

      const hfin = new THREE.Mesh(geo('wing_f14_hfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.8, 1.2);
        shape.lineTo(2.8, 2.0);
        shape.lineTo(0, 1.2);
        shape.lineTo(-2.8, 2.0);
        shape.lineTo(-2.8, 1.2);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, 0.2, 3.6);
        return g;
      }), darkMat);
      airframeParts.push(hfin);

      // Swing wing panels
      const wingPanelLGeo = geo('wing_f14_panel_l', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.6);
        shape.lineTo(-4.8, 0.4);
        shape.lineTo(-4.8, 1.5);
        shape.lineTo(0, 1.8);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        return g;
      });
      const wingPanelRGeo = geo('wing_f14_panel_r', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.6);
        shape.lineTo(4.8, 0.4);
        shape.lineTo(4.8, 1.5);
        shape.lineTo(0, 1.8);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        return g;
      });

      const swingGroupL = new THREE.Group();
      swingGroupL.position.set(-1.85, -0.12, 1.0);
      const meshL = new THREE.Mesh(wingPanelLGeo, wingMat);
      swingGroupL.add(meshL);
      const tipMeshL = makeTip(new THREE.Vector3(-4.8, 0, 0.95));
      swingGroupL.add(tipMeshL);

      const swingGroupR = new THREE.Group();
      swingGroupR.position.set(1.85, -0.12, 1.0);
      const meshR = new THREE.Mesh(wingPanelRGeo, wingMat);
      swingGroupR.add(meshR);
      const tipMeshR = makeTip(new THREE.Vector3(4.8, 0, 0.95));
      swingGroupR.add(tipMeshR);

      airframeParts.push(swingGroupL, swingGroupR);

      this.swingWings = {
        groupL: swingGroupL,
        groupR: swingGroupR,
        pivotL: new THREE.Vector3(-1.85, -0.12, 1.0),
        pivotR: new THREE.Vector3(1.85, -0.12, 1.0),
      };
      this.currentSweep = 0;
      this.wingTipL.set(-6.65, -0.12, 1.95);
      this.wingTipR.set(6.65, -0.12, 1.95);

    } else if (wing === 'wing_f22') {
      // F-22 Raptor: Diamond Stealth Wings + Canted Twin Fins + Stealth Horizontal Tails
      const f22Wing = new THREE.Mesh(geo('wing_f22_main', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.6);
        shape.lineTo(6.5, 2.2);
        shape.lineTo(6.5, 3.1);
        shape.lineTo(0, 4.0);
        shape.lineTo(-6.5, 3.1);
        shape.lineTo(-6.5, 2.2);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, -0.15, 0);
        return g;
      }), wingMat);
      airframeParts.push(f22Wing);

      const f22FinGeo = geo('wing_f22_vfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.4, 0);
        shape.lineTo(1.6, 2.6);
        shape.lineTo(0.6, 2.6);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
        g.rotateY(-Math.PI / 2);
        return g;
      });
      for (const sx of [-1.75, 1.75]) {
        const sign = sx > 0 ? 1 : -1;
        const fin = new THREE.Mesh(f22FinGeo, bodyMat);
        fin.position.set(sx, 0.55, 2.4);
        fin.rotation.z = -sign * 0.49;
        airframeParts.push(fin);
      }

      const f22Hfin = new THREE.Mesh(geo('wing_f22_hfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.6, 0.8);
        shape.lineTo(2.6, 1.7);
        shape.lineTo(0, 1.4);
        shape.lineTo(-2.6, 1.7);
        shape.lineTo(-2.6, 0.8);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, 0.25, 3.6);
        return g;
      }), darkMat);
      airframeParts.push(f22Hfin);

      this.wingTipL.set(-6.5, -0.15, 2.65);
      this.wingTipR.set(6.5, -0.15, 2.65);
      airframeParts.push(makeTip(this.wingTipL), makeTip(this.wingTipR));

    } else if (wing === 'wing_su30') {
      // Su-30 Flanker: Tandem Triplane Canards + Swept Wings + Twin Tails + Tail Sting
      const su30Wing = new THREE.Mesh(geo('wing_su30_main', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, -1.0);
        shape.lineTo(6.6, 2.0);
        shape.lineTo(6.6, 3.0);
        shape.lineTo(0, 2.6);
        shape.lineTo(-6.6, 3.0);
        shape.lineTo(-6.6, 2.0);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, -0.15, 0);
        return g;
      }), wingMat);
      airframeParts.push(su30Wing);

      const railGeo = geo('wing_su30_rail', () => {
        const g = new THREE.BoxGeometry(0.12, 0.12, 1.8);
        return g;
      });
      for (const sx of [-6.6, 6.6]) {
        const rail = new THREE.Mesh(railGeo, darkMat);
        rail.position.set(sx, -0.15, 2.5);
        airframeParts.push(rail);
      }

      // Tandem Triplane Foreplane Canards
      const su30Canards = new THREE.Mesh(geo('wing_su30_canards', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.8, 0.9);
        shape.lineTo(2.8, 1.6);
        shape.lineTo(0, 1.0);
        shape.lineTo(-2.8, 1.6);
        shape.lineTo(-2.8, 0.9);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, 0.18, -2.2);
        return g;
      }), wingMat);
      airframeParts.push(su30Canards);

      const su30FinGeo = geo('wing_su30_vfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.4, 0);
        shape.lineTo(1.8, 2.8);
        shape.lineTo(0.6, 2.8);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
        g.rotateY(-Math.PI / 2);
        return g;
      });
      for (const sx of [-1.65, 1.65]) {
        const vfin = new THREE.Mesh(su30FinGeo, bodyMat);
        vfin.position.set(sx, 0.55, 2.2);
        airframeParts.push(vfin);
      }

      const tailSting = new THREE.Mesh(geo('wing_su30_sting', () => {
        const g = new THREE.CylinderGeometry(0.24, 0.16, 2.4, 6);
        g.rotateX(-Math.PI / 2);
        return g;
      }), darkMat);
      tailSting.position.set(0, 0.1, 4.8);
      airframeParts.push(tailSting);

      const su30Hfin = new THREE.Mesh(geo('wing_su30_hfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.8, 1.4);
        shape.lineTo(2.8, 2.2);
        shape.lineTo(0, 1.4);
        shape.lineTo(-2.8, 2.2);
        shape.lineTo(-2.8, 1.4);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, 0.15, 3.6);
        return g;
      }), darkMat);
      airframeParts.push(su30Hfin);

      this.wingTipL.set(-6.6, -0.15, 2.5);
      this.wingTipR.set(6.6, -0.15, 2.5);
      airframeParts.push(makeTip(this.wingTipL), makeTip(this.wingTipR));

    } else {
      // wing_default (Standard Delta)
      const sweptWing = new THREE.Mesh(geo('wing', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, -1.2);
        shape.lineTo(6.2, 2.4);
        shape.lineTo(6.2, 3.4);
        shape.lineTo(0, 2.0);
        shape.lineTo(-6.2, 3.4);
        shape.lineTo(-6.2, 2.4);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, -0.2, 0);
        return g;
      }), wingMat);
      airframeParts.push(sweptWing);

      const vfin = new THREE.Mesh(geo('vfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.6, 0);
        shape.lineTo(2.2, 2.6);
        shape.lineTo(1.2, 2.6);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
        g.rotateY(-Math.PI / 2);
        g.translate(0.15, 0.6, 1.4);
        return g;
      }), bodyMat);
      airframeParts.push(vfin);

      const hfin = new THREE.Mesh(geo('hfin', () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(2.6, 1.3);
        shape.lineTo(2.6, 2.0);
        shape.lineTo(0, 1.4);
        shape.lineTo(-2.6, 2.0);
        shape.lineTo(-2.6, 1.3);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        g.translate(0, 0.3, 2.2);
        return g;
      }), darkMat);
      airframeParts.push(hfin);

      this.wingTipL.set(-6.1, 0, 2.9);
      this.wingTipR.set(6.1, 0, 2.9);
      airframeParts.push(makeTip(this.wingTipL), makeTip(this.wingTipR));
    }

    for (const m of airframeParts) {
      m.castShadow = true;
      m.receiveShadow = false;
    }
    this.body.add(...airframeParts);

    // Synthwave Wireframe Overlay:
    if (finish === 'finish_synth') {
      const wireMat = new THREE.MeshBasicMaterial({
        color: pilot.colors.accent || pilot.colors.trail,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      this._disposables.push(wireMat);
      this.synthOverlay = new THREE.Group();
      for (const m of airframeParts) {
        if (m === this.burner || !m.geometry || m.geometry === geo('tip', () => new THREE.SphereGeometry(0.28, 6, 4))) continue;
        const wm = new THREE.Mesh(m.geometry, wireMat);
        wm.position.copy(m.position);
        wm.rotation.copy(m.rotation);
        wm.scale.copy(m.scale).multiplyScalar(1.02);
        this.synthOverlay.add(wm);
      }
      this.body.add(this.synthOverlay);
    }

    // Lightning Trail lines setup
    if (this.lightningLines) {
      this.group.remove(this.lightningLines);
      this.lightningLines = null;
    }
    if (this.equipped && this.equipped.trail === 'trail_lightning') {
      this.lightningLines = this._createLightningArcs();
      this.group.add(this.lightningLines);
    }
  }

  _createLightningArcs() {
    const group = new THREE.Group();
    const count = 6;
    const arcLGeo = new THREE.BufferGeometry();
    const arcRGeo = new THREE.BufferGeometry();
    const posL = new Float32Array(count * 3);
    const posR = new Float32Array(count * 3);
    arcLGeo.setAttribute('position', new THREE.BufferAttribute(posL, 3));
    arcRGeo.setAttribute('position', new THREE.BufferAttribute(posR, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x88f0ff,
      transparent: true,
      opacity: 0.85,
      linewidth: 2,
    });
    this._disposables.push(arcLGeo, arcRGeo, mat);
    const lineL = new THREE.Line(arcLGeo, mat);
    const lineR = new THREE.Line(arcRGeo, mat);
    group.add(lineL, lineR);
    group.lineL = lineL;
    group.lineR = lineR;
    return group;
  }

  _ensureVoxelPool() {
    if (this.voxelPool.length > 0) return;
    const vGeo = geo('trail_voxel_geo', () => new THREE.BoxGeometry(0.7, 0.7, 0.7));
    const mat = new THREE.MeshStandardMaterial({
      color: this.pilot.colors.trail,
      emissive: this.pilot.colors.accent || this.pilot.colors.trail,
      emissiveIntensity: 0.8,
      roughness: 0.4,
      flatShading: true,
    });
    this._disposables.push(mat);
    for (let i = 0; i < 20; i++) {
      const mesh = new THREE.Mesh(vGeo, mat);
      mesh.visible = false;
      this.voxelPool.push({
        mesh,
        life: 0,
        maxLife: 0.6,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        addedToScene: false,
      });
    }
  }

  _ensureRingPool() {
    if (this.ringPool.length > 0) return;
    const rGeo = geo('trail_ring_geo', () => new THREE.TorusGeometry(1.6, 0.16, 6, 20));
    const mat = new THREE.MeshBasicMaterial({
      color: this.pilot.colors.trail,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this._disposables.push(mat);
    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(rGeo, mat);
      mesh.visible = false;
      this.ringPool.push({
        mesh,
        life: 0,
        maxLife: 0.55,
        pos: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        addedToScene: false,
      });
    }
  }

  setEquipped(equipped) {
    this.equipped = Object.assign({}, this.equipped, equipped || {});
    this._buildAirframe();
  }

  setName(name) {
    this.group.remove(this.label);
    this.name = name;
    this.label = makeLabel(name, this.trailCss, this.pilot.callsign, this.portrait);
    this.label.position.y = 4.6;
    this.group.add(this.label);
  }

  /** Red vs Blue: show this jet's team ring (team = 'red' | 'blue' | null). */
  setTeam(team) {
    if (!team) { this.teamRing.visible = false; return; }
    const hex = team === 'blue' ? 0x47c8ff : 0xff5e5b;
    this.teamRingMat.color.setHex(hex);
    this.teamRingMat.emissive.setHex(hex);
    this.teamRing.visible = true;
  }

  /** Ghost power-up: fade every opaque material. */
  _setGhost(on) {
    if (on === this.ghosted) return;
    this.ghosted = on;
    const isHolo = this.equipped && this.equipped.finish === 'finish_holo';
    for (const m of this.opaqueMats) {
      m.transparent = on || isHolo;
      m.opacity = on ? 0.35 : (isHolo ? 0.6 : 1);
      m.needsUpdate = true;
    }
  }

  /** Per-frame visual flourish: afterburner size, super ring, shield, power-ups, tumble spin. */
  updateVisual(dt, info, particles, time) {
    const fx = info.fx || {};
    const boostAmt = info.boost ? 1 : 0;
    const superAmt = info.super ? 1 : 0;
    const finish = this.equipped ? this.equipped.finish : 'finish_default';
    const trailStyle = this.equipped ? this.equipped.trail : 'trail_default';

    // Finish Flourishes
    if (finish === 'finish_holo' && !this.ghosted) {
      const pulse = 0.5 + Math.sin(time * 5) * 0.18;
      this.bodyMat.opacity = pulse;
      this.wingMat.opacity = pulse;
      this.bodyMat.emissiveIntensity = 0.7 + Math.sin(time * 6) * 0.35;
      this.wingMat.emissiveIntensity = 0.7 + Math.sin(time * 6) * 0.35;
    }
    if (this.synthOverlay) {
      const synthPulse = 0.65 + Math.sin(time * 8) * 0.25;
      for (const m of this.synthOverlay.children) {
        if (m.material) m.material.opacity = synthPulse;
      }
    }
    if (finish === 'finish_gold' && particles && Math.random() < 0.15) {
      const off = new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 6)
        .applyQuaternion(this.group.quaternion).add(this.group.position);
      particles.spawn({
        pos: off,
        vel: { x: (Math.random() - 0.5) * 1.5, y: 0.5 + Math.random() * 1.5, z: (Math.random() - 0.5) * 1.5 },
        life: 0.45,
        size: 0.4,
        drag: 1.5,
        colors: GOLD_COLORS,
        glow: 2.5,
      });
    }

    // Power-up visuals
    this.bubble.visible = Boolean(fx.shield);
    if (this.bubble.visible) { this.bubble.rotation.y += dt * 0.8; this.bubble.rotation.z -= dt * 0.5; this.bubbleMat.opacity = 0.14 + Math.sin(time * 6) * 0.04; }
    this.turboFlames.visible = Boolean(fx.turbo);
    if (this.turboFlames.visible) { const k = 1 + Math.sin(time * 50) * 0.25; this.turboFlames.scale.set(1, 1, k); }
    this.rapidPods.visible = Boolean(fx.rapid);
    if (this.rapidPods.visible) this.rapidMat.emissiveIntensity = 2.4 + Math.sin(time * 30) * 1.2;
    this.magnetRing.visible = Boolean(fx.magnet);
    if (this.magnetRing.visible) { this.magnetRing.rotation.x = Math.sin(time * 2) * 0.6; this.magnetRing.rotation.y += dt * 3; }
    this.x2Halo.visible = Boolean(fx.x2);
    if (this.x2Halo.visible) this.x2Halo.rotation.z += dt * 4;
    this._setGhost(Boolean(fx.ghost));
    this.fxTimer -= dt;
    if (particles && this.fxTimer <= 0 && (fx.turbo || fx.magnet || fx.x2)) {
      this.fxTimer = 0.08;
      const col = fx.turbo ? TURBO_COLORS : fx.magnet ? MAGNET_COLORS : GOLD_COLORS;
      const off = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 3, 2 + Math.random() * 5).applyQuaternion(this.group.quaternion).add(this.group.position);
      particles.spawn({ pos: off, vel: { x: (Math.random() - 0.5) * 4, y: 1 + Math.random() * 2, z: (Math.random() - 0.5) * 4 }, life: 0.5, size: 0.5, drag: 1.5, colors: col, glow: 2.2 });
    }
    const s = 0.8 + boostAmt * 0.6 + superAmt * 0.9 + Math.sin(time * 40) * 0.12;
    this.burner.scale.set(1 + boostAmt * 0.3 + superAmt * 0.4, 1 + boostAmt * 0.3 + superAmt * 0.4, s);
    this.burnerMat.emissiveIntensity = 2.6 + boostAmt * 1.0 + superAmt * 1.4;
    this.burnerMat.emissive.setHex(info.super ? 0x4ff1ff : (this.burnerEmissiveHex || 0xff9a2a));
    if (this.warpRings) {
      this.warpRings[0].rotation.z += dt * 3.5;
      this.warpRings[1].rotation.z -= dt * 4.2;
      this.warpRings[2].rotation.z += dt * 5.0;
    }
    if (this.cyberSpine) {
      this.cyberSpine.material.emissiveIntensity = 2.0 + Math.sin(time * 8) * 1.0;
    }
    // F-14 Tomcat Swing Wings: Dynamic Variable Sweep
    if (this.swingWings) {
      const isFullSpeed = Boolean(info.boost || info.super || (fx && fx.turbo));
      const targetSweep = isFullSpeed ? 0.76 : 0.0;
      this.currentSweep = THREE.MathUtils.lerp(this.currentSweep || 0, targetSweep, Math.min(1, dt * 7.0));
      this.swingWings.groupL.rotation.y = -this.currentSweep;
      this.swingWings.groupR.rotation.y = this.currentSweep;

      const cosS = Math.cos(this.currentSweep);
      const sinS = Math.sin(this.currentSweep);
      const xL = -4.8 * cosS + 0.95 * sinS;
      const zL = 4.8 * sinS + 0.95 * cosS;
      this.wingTipL.set(this.swingWings.pivotL.x + xL, this.swingWings.pivotL.y, this.swingWings.pivotL.z + zL);

      const xR = 4.8 * cosS - 0.95 * sinS;
      const zR = 4.8 * sinS + 0.95 * cosS;
      this.wingTipR.set(this.swingWings.pivotR.x + xR, this.swingWings.pivotR.y, this.swingWings.pivotR.z + zR);
    }
    this.shield.visible = Boolean(info.invuln);
    if (this.shield.visible) { this.shield.rotation.y += dt * 2; this.shield.rotation.x += dt * 1.3; }
    if (this.teamRing.visible) { this.teamRing.rotation.z += dt * 0.9; this.teamRingMat.emissiveIntensity = 1.8 + Math.sin(time * 4) * 0.6; }
    this.superRing.visible = Boolean(info.super);
    if (this.superRing.visible) this.superRing.rotation.z += dt * 12;

    // Tumble: a harmless 360 spin on hit
    if (info.tumble > 0) {
      this.tumbleSpin = (info.tumble / 0.6) * Math.PI * 2;
      this.body.rotation.x = this.tumbleSpin;
    } else if (this.body.rotation.x !== 0) {
      this.body.rotation.x = 0;
    }

    // Contrail: Electric Lightning Arcs behind wingtips
    if (this.lightningLines) {
      const segs = 6;
      const boost = info.boost || info.super ? 1.6 : 1.0;
      const posL = this.lightningLines.lineL.geometry.attributes.position.array;
      const posR = this.lightningLines.lineR.geometry.attributes.position.array;
      for (let i = 0; i < segs; i++) {
        const frac = i / (segs - 1);
        const zOff = frac * 4.5 * boost;
        const jx = (Math.random() - 0.5) * 0.7 * frac;
        const jy = (Math.random() - 0.5) * 0.7 * frac;
        posL[i * 3 + 0] = this.wingTipL.x + jx;
        posL[i * 3 + 1] = this.wingTipL.y + jy;
        posL[i * 3 + 2] = this.wingTipL.z + zOff;

        posR[i * 3 + 0] = this.wingTipR.x + jx;
        posR[i * 3 + 1] = this.wingTipR.y + jy;
        posR[i * 3 + 2] = this.wingTipR.z + zOff;
      }
      this.lightningLines.lineL.geometry.attributes.position.needsUpdate = true;
      this.lightningLines.lineR.geometry.attributes.position.needsUpdate = true;
      this.lightningLines.lineL.material.opacity = 0.55 + Math.random() * 0.45;
    }

    // Contrail: 8-Bit Cubes (trail_voxel)
    const scene = this.group.parent;
    if (trailStyle === 'trail_voxel' && scene) {
      this._ensureVoxelPool();
      for (const v of this.voxelPool) {
        if (!v.addedToScene) { scene.add(v.mesh); v.addedToScene = true; }
        if (v.life > 0) {
          v.life -= dt;
          if (v.life <= 0) {
            v.mesh.visible = false;
          } else {
            v.pos.addScaledVector(v.vel, dt);
            v.mesh.position.copy(v.pos);
            v.mesh.rotation.x += v.rotVel.x * dt;
            v.mesh.rotation.y += v.rotVel.y * dt;
            v.mesh.rotation.z += v.rotVel.z * dt;
            const sc = (v.life / v.maxLife) * 1.1;
            v.mesh.scale.set(sc, sc, sc);
          }
        }
      }
      this.voxelTimer -= dt;
      if (this.voxelTimer <= 0) {
        this.voxelTimer = info.boost || info.super ? 0.03 : 0.06;
        const v = this.voxelPool.find((item) => item.life <= 0);
        if (v) {
          const back = new THREE.Vector3(0, 0, 6.8).applyQuaternion(this.group.quaternion).add(this.group.position);
          v.pos.copy(back);
          v.vel.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3 + 0.5, (Math.random() - 0.5) * 3);
          v.rotVel.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
          v.life = 0.6;
          v.maxLife = 0.6;
          v.mesh.visible = true;
          v.mesh.position.copy(v.pos);
        }
      }
    }

    // Contrail: Plasma Donut Rings (trail_rings)
    if (trailStyle === 'trail_rings' && scene) {
      this._ensureRingPool();
      for (const r of this.ringPool) {
        if (!r.addedToScene) { scene.add(r.mesh); r.addedToScene = true; }
        if (r.life > 0) {
          r.life -= dt;
          if (r.life <= 0) {
            r.mesh.visible = false;
          } else {
            const frac = 1 - (r.life / r.maxLife);
            const scale = 1.0 + frac * 4.0;
            r.mesh.scale.set(scale, scale, 1);
            r.mesh.material.opacity = (1 - frac) * 0.85;
            r.mesh.position.copy(r.pos);
            r.mesh.quaternion.copy(r.quat);
          }
        }
      }
      this.ringTimer -= dt;
      if ((info.boost || info.super || fx.turbo) && this.ringTimer <= 0) {
        this.ringTimer = 0.08;
        const r = this.ringPool.find((item) => item.life <= 0);
        if (r) {
          const back = new THREE.Vector3(0, 0, 7.2).applyQuaternion(this.group.quaternion).add(this.group.position);
          r.pos.copy(back);
          r.quat.copy(this.group.quaternion);
          r.life = 0.55;
          r.maxLife = 0.55;
          r.mesh.visible = true;
          r.mesh.position.copy(r.pos);
          r.mesh.quaternion.copy(r.quat);
          r.mesh.scale.set(1, 1, 1);
        }
      }
    }

    // Exhaust puffs (with Prismatic Rainbow support)
    this.exhaustTimer -= dt;
    if (particles && this.exhaustTimer <= 0) {
      this.exhaustTimer = info.boost || info.super ? 0.025 : 0.06;
      const back = new THREE.Vector3(0, 0, 7.5).applyQuaternion(this.group.quaternion).add(this.group.position);
      const spread = 0.6;
      let colors;
      if (info.super) {
        colors = SUPER_COLORS;
      } else if (trailStyle === 'trail_rainbow') {
        const h = (time * 1.6) % 1.0;
        colors = [
          new THREE.Color().setHSL(h, 1.0, 0.65),
          new THREE.Color().setHSL((h + 0.15) % 1.0, 1.0, 0.55),
          new THREE.Color().setHSL((h + 0.3) % 1.0, 1.0, 0.45),
        ];
      } else if (info.boost || fx.turbo) {
        colors = this.trailColors;
      } else {
        colors = EXHAUST_COLORS;
      }

      particles.spawn({
        pos: back,
        vel: { x: (Math.random() - 0.5) * spread * 4, y: (Math.random() - 0.5) * spread * 4 + 1, z: (Math.random() - 0.5) * spread * 4 },
        life: info.super ? 0.9 : info.boost ? 0.7 : 0.5,
        size: info.boost || info.super ? 0.9 : 0.6,
        drag: 1.2,
        colors,
        glow: info.boost || info.super || fx.turbo || trailStyle === 'trail_rainbow' ? 2.0 : 1.4,
      });
    }
  }

  dispose() {
    if (this._disposables) {
      for (const d of this._disposables) if (d && d.dispose) d.dispose();
    }
    const scene = this.group.parent;
    for (const v of this.voxelPool) {
      if (scene && v.mesh.parent === scene) scene.remove(v.mesh);
    }
    for (const r of this.ringPool) {
      if (scene && r.mesh.parent === scene) scene.remove(r.mesh);
    }
    this.bubbleMat.dispose();
    this.turboMat.dispose();
    this.rapidMat.dispose();
    this.teamRingMat.dispose();
    if (this.label.material.map) this.label.material.map.dispose();
    this.label.material.dispose();
  }
}

const EXHAUST_COLORS = [new THREE.Color(0xfff2c0), new THREE.Color(0xff8a2a), new THREE.Color(0x4a4458)];
const SUPER_COLORS = [new THREE.Color(0xe0ffff), new THREE.Color(0x4ff1ff), new THREE.Color(0x2b3f6e)];
const TURBO_COLORS = [new THREE.Color(0xfff2c0), new THREE.Color(0xff7a1a), new THREE.Color(0x6e2a1d)];
const MAGNET_COLORS = [new THREE.Color(0xf4ffd0), new THREE.Color(0xb6ff3c), new THREE.Color(0x2d5a1d)];
export const SHIELD_COLORS = [new THREE.Color(0xffffff), new THREE.Color(0x4ff1ff), new THREE.Color(0x1d3c6e)];
/** Particle palette for each power-up type (pickup bursts). */
export function powerupPalette(type) {
  const c = new THREE.Color(POWERUPS[type] ? POWERUPS[type].color : 0xffffff);
  return [new THREE.Color(0xffffff), c, c.clone().multiplyScalar(0.3)];
}
export const FIREWORK_PALETTES = [
  [new THREE.Color(0xffffff), new THREE.Color(0xff5e5b), new THREE.Color(0x6e1f3a)],
  [new THREE.Color(0xffffff), new THREE.Color(0x4ff0b0), new THREE.Color(0x1d5a4a)],
  [new THREE.Color(0xffffff), new THREE.Color(0x47c8ff), new THREE.Color(0x1d3c6e)],
  [new THREE.Color(0xffffff), new THREE.Color(0xffe84a), new THREE.Color(0x6e5a1d)],
  [new THREE.Color(0xffffff), new THREE.Color(0xff6bd6), new THREE.Color(0x6e1d5a)],
];
export const SPLASH_COLORS = [new THREE.Color(0xffffff), new THREE.Color(0x9fe8ff), new THREE.Color(0x0f5e78)];
export const GOLD_COLORS = [new THREE.Color(0xfff6c0), new THREE.Color(0xffd54a), new THREE.Color(0x8a5a10)];

function makeLabel(text, color, callsign = '', portrait = null) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  const font = '-apple-system, Segoe UI, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 34px ${font}`;
  const nameW = ctx.measureText(text).width;
  ctx.font = `bold 20px ${font}`;
  const callW = callsign ? ctx.measureText(callsign).width : 0;
  const textW = Math.max(nameW, callW);
  const padL = portrait ? 76 : 16;
  const w = Math.min(312, textW + padL + 16);
  const x0 = 160 - w / 2;
  ctx.fillStyle = 'rgba(20,14,40,0.6)';
  roundRect(ctx, x0, 6, w, 68, 16);
  ctx.fill();
  if (portrait) {
    ctx.save();
    roundRect(ctx, x0 + 8, 12, 56, 56, 12);
    ctx.clip();
    ctx.drawImage(portrait, x0 + 8, 12, 56, 56);
    ctx.restore();
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = `bold 34px ${font}`;
  ctx.fillText(text, x0 + padL, callsign ? 30 : 40, w - padL - 12);
  if (callsign) {
    ctx.fillStyle = 'rgba(255,246,232,0.8)';
    ctx.font = `bold 20px ${font}`;
    ctx.fillText(callsign, x0 + padL, 58, w - padL - 12);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(12, 3, 1);
  sprite.renderOrder = 5;
  return sprite;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Floating emote: a big emoji drawn onto a canvas sprite (name-tag rendering approach). */
export function makeEmojiSprite(emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = '92px -apple-system, Segoe UI, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 70);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(7, 7, 1);
  sprite.renderOrder = 6;
  return sprite;
}

// ---------------------------------------------------------------------------
// Golden Crown
// ---------------------------------------------------------------------------
export class Crown {
  constructor() {
    this.group = new THREE.Group();
    this.mat = new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffb300, emissiveIntensity: 3.0, roughness: 0.3, metalness: 0.6, flatShading: true });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.7, 1.8, 8, 1, true), this.mat);
    band.material.side = THREE.DoubleSide;
    this.group.add(band);
    for (let i = 0; i < 8; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.75, i % 2 ? 2.4 : 3.4, 4), this.mat);
      const ang = (i / 8) * Math.PI * 2;
      spike.position.set(Math.cos(ang) * 2.9, 1.6 + (i % 2 ? 0.7 : 1.2), Math.sin(ang) * 2.9);
      this.group.add(spike);
    }
    const gemMat = new THREE.MeshStandardMaterial({ color: 0xff4fd8, emissive: 0xff4fd8, emissiveIntensity: 2.5, flatShading: true });
    for (let i = 0; i < 4; i++) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), gemMat);
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 8;
      gem.position.set(Math.cos(ang) * 3.1, 0, Math.sin(ang) * 3.1);
      this.group.add(gem);
    }
    this.halo = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.18, 6, 32), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffe08a, emissiveIntensity: 2.2, transparent: true, opacity: 0.7 }));
    this.halo.rotation.x = Math.PI / 2;
    this.group.add(this.halo);
    this.group.scale.setScalar(1.3);
    this.glowTimer = 0;
  }

  update(dt, time, loose, particles) {
    this.group.rotation.y += dt * 1.6;
    this.halo.rotation.z += dt * 0.8;
    this.mat.emissiveIntensity = 2.8 + Math.sin(time * 5) * 0.5;
    const s = loose ? 2.2 + Math.sin(time * 3) * 0.15 : 1.3;
    this.group.scale.setScalar(s);
    if (loose) this.group.position.y += Math.sin(time * 2.2) * dt * 1.5;
    this.glowTimer -= dt;
    if (particles && this.glowTimer <= 0) {
      this.glowTimer = loose ? 0.12 : 0.2;
      particles.spawn({
        pos: this.group.position,
        vel: { x: (Math.random() - 0.5) * 6, y: 3 + Math.random() * 4, z: (Math.random() - 0.5) * 6 },
        life: 0.7, size: 0.7, drag: 1.5, colors: GOLD_COLORS, glow: 2.4,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Ribbon contrail of the crown holder (steal by flying through it)
// ---------------------------------------------------------------------------
export class Ribbon {
  constructor(maxPoints = 48) {
    this.maxPoints = maxPoints;
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(maxPoints * 2 * 3);
    this.alphas = new Float32Array(maxPoints * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    const indices = [];
    for (let i = 0; i < maxPoints - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
      indices.push(a, b, c, b, d, c);
    }
    geo.setIndex(indices);
    this.geo = geo;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(0xffd54a) }, time: { value: 0 } },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        varying float vAlpha;
        void main() {
          float shimmer = 0.8 + 0.2 * sin(time * 12.0 + vAlpha * 20.0);
          gl_FragColor = vec4(color * 2.6 * shimmer, vAlpha * 0.85);
        }`,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.count = 0;
  }

  /** points: array of [x, y, z] from oldest to newest. */
  setPoints(points, time) {
    this.mat.uniforms.time.value = time;
    const n = Math.min(points.length, this.maxPoints);
    if (n < 2) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    const up = new THREE.Vector3(), dir = new THREE.Vector3(), side = new THREE.Vector3();
    const p = new THREE.Vector3(), q = new THREE.Vector3();
    for (let i = 0; i < this.maxPoints; i++) {
      const idx = Math.min(i, n - 1);
      const pt = points[points.length - n + idx];
      p.set(pt[0], pt[1], pt[2]);
      const nxt = points[points.length - n + Math.min(idx + 1, n - 1)];
      const prv = points[points.length - n + Math.max(idx - 1, 0)];
      q.set(nxt[0] - prv[0], nxt[1] - prv[1], nxt[2] - prv[2]);
      dir.copy(q).normalize();
      up.set(0, 1, 0);
      side.crossVectors(dir, up).normalize();
      if (side.lengthSq() < 0.01) side.set(1, 0, 0);
      const age = idx / Math.max(1, n - 1);
      const width = 1.2 + age * 1.6;
      const wave = Math.sin(time * 6 + idx * 0.6) * 0.5;
      this.positions[i * 6] = p.x + side.x * width + wave * up.x;
      this.positions[i * 6 + 1] = p.y + side.y * width + wave;
      this.positions[i * 6 + 2] = p.z + side.z * width;
      this.positions[i * 6 + 3] = p.x - side.x * width;
      this.positions[i * 6 + 4] = p.y - side.y * width - wave;
      this.positions[i * 6 + 5] = p.z - side.z * width;
      this.alphas[i * 2] = age * 0.9;
      this.alphas[i * 2 + 1] = age * 0.9;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.alpha.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Hot-air balloons
// ---------------------------------------------------------------------------
export class Balloon {
  constructor(tintIndex) {
    this.group = new THREE.Group();
    const tint = BALLOON_TINTS[tintIndex % BALLOON_TINTS.length];
    this.mat = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 1.6, flatShading: true, roughness: 0.6 });
    const envelope = new THREE.Mesh(geo('balloon', () => {
      const g = new THREE.SphereGeometry(5, 10, 8);
      g.scale(1, 1.2, 1);
      return g;
    }), this.mat);
    envelope.position.y = 4;
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfff6e8, emissive: 0xfff6e8, emissiveIntensity: 0.9, flatShading: true });
    const stripe = new THREE.Mesh(geo('balloonStripe', () => new THREE.TorusGeometry(5.05, 0.35, 6, 14)), stripeMat);
    stripe.rotation.x = Math.PI / 2;
    stripe.position.y = 4;
    const basket = new THREE.Mesh(geo('basket', () => new THREE.BoxGeometry(2.2, 1.6, 2.2)), new THREE.MeshStandardMaterial({ color: 0x8a5a3a, flatShading: true, roughness: 0.9 }));
    basket.position.y = -3.6;
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x4a4458 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const rope = new THREE.Mesh(geo('rope', () => new THREE.CylinderGeometry(0.08, 0.08, 3.4, 3)), ropeMat);
        rope.position.set(sx * 1.6, -1.6, sz * 1.6);
        rope.rotation.z = sx * 0.35;
        rope.rotation.x = -sz * 0.35;
        this.group.add(rope);
      }
    }
    envelope.castShadow = true;
    this.group.add(envelope, stripe, basket);
    this.bobPhase = Math.random() * Math.PI * 2;
    this.baseY = 0;
    this.tint = tint;
  }

  setPosition(x, y, z) {
    this.baseY = y;
    this.group.position.set(x, y, z);
  }

  update(dt, time) {
    this.group.position.y = this.baseY + Math.sin(time * 0.9 + this.bobPhase) * 1.5;
    this.group.rotation.y += dt * 0.25;
  }
}

// ---------------------------------------------------------------------------
// Firework rocket
// ---------------------------------------------------------------------------
export class Rocket {
  /** @param {number} paint hex colour of the firing pilot's trail */
  constructor(paint) {
    this.group = new THREE.Group();
    this.headMat = new THREE.MeshStandardMaterial({ color: paint, emissive: paint, emissiveIntensity: 3.6, flatShading: true });
    const head = new THREE.Mesh(geo('rocketHead', () => {
      const g = new THREE.ConeGeometry(0.9, 2.2, 6);
      g.rotateX(-Math.PI / 2);
      return g;
    }), this.headMat);
    head.position.z = -1.6;
    const body = new THREE.Mesh(geo('rocketBody', () => {
      const g = new THREE.CylinderGeometry(0.75, 0.75, 2.6, 6);
      g.rotateX(-Math.PI / 2);
      return g;
    }), new THREE.MeshStandardMaterial({ color: 0xfff6e8, flatShading: true, roughness: 0.5 }));
    body.position.z = 0.6;
    const fins = new THREE.Mesh(geo('rocketFins', () => {
      const g = new THREE.ConeGeometry(1.5, 1.4, 4);
      g.rotateX(Math.PI / 2);
      return g;
    }), new THREE.MeshStandardMaterial({ color: 0x2a2438, flatShading: true }));
    fins.position.z = 2.0;
    const flame = new THREE.Mesh(geo('rocketFlame', () => {
      const g = new THREE.ConeGeometry(0.6, 2.4, 5);
      g.rotateX(Math.PI / 2);
      return g;
    }), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb347, emissiveIntensity: 3.0 }));
    flame.position.z = 3.2;
    this.group.add(head, body, fins, flame);
    this.trailTimer = 0;
    this.colors = [new THREE.Color(0xffffff), new THREE.Color(paint), new THREE.Color(0x4a4458)];
  }

  update(dt, particles) {
    this.trailTimer -= dt;
    if (particles && this.trailTimer <= 0) {
      this.trailTimer = 0.03;
      const back = new THREE.Vector3(0, 0, 3.5).applyQuaternion(this.group.quaternion).add(this.group.position);
      particles.spawn({
        pos: back,
        vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5, z: (Math.random() - 0.5) * 5 },
        life: 0.55, size: 1.0, drag: 1.0, colors: this.colors, glow: 1.8,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Power-up pickup orbs: glowing core + type-specific inner symbol + orbit ring.
// ---------------------------------------------------------------------------
export class Pickup {
  constructor(type) {
    this.type = type;
    this.group = new THREE.Group();
    const def = POWERUPS[type] || POWERUPS.turbo;
    const col = def.color;
    this.coreMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.2, transparent: true, opacity: 0.55, flatShading: true, depthWrite: false });
    this.symbolMat = new THREE.MeshStandardMaterial({ color: 0xfff6e8, emissive: col, emissiveIntensity: 3.2, flatShading: true });
    this.ringMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.6, transparent: true, opacity: 0.85 });
    this.core = new THREE.Mesh(geo('pickupCore', () => new THREE.IcosahedronGeometry(4.2, 1)), this.coreMat);
    this.group.add(this.core);
    this.cage = new THREE.Mesh(geo('pickupCage', () => new THREE.IcosahedronGeometry(4.6, 0)), new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.6 }));
    this.group.add(this.cage);
    this.symbol = new THREE.Group();
    switch (type) {
      case 'turbo': {
        const m = new THREE.Mesh(geo('pkTurbo', () => { const g = new THREE.ConeGeometry(1.3, 3.4, 4); g.rotateX(Math.PI / 2); return g; }), this.symbolMat);
        const m2 = m.clone(); m2.position.z = 1.2; m2.scale.setScalar(0.65);
        m.position.z = -1.2;
        this.symbol.add(m, m2);
        break;
      }
      case 'shield': {
        const m = new THREE.Mesh(geo('pkShield', () => new THREE.OctahedronGeometry(2.1, 0)), this.symbolMat);
        m.scale.set(1, 1.35, 0.45);
        this.symbol.add(m);
        break;
      }
      case 'rapid': {
        for (let i = 0; i < 3; i++) {
          const m = new THREE.Mesh(geo('pkRapid', () => { const g = new THREE.CylinderGeometry(0.4, 0.4, 3.2, 5); g.rotateX(Math.PI / 2); return g; }), this.symbolMat);
          m.position.set((i - 1) * 1.3, 0, 0);
          this.symbol.add(m);
        }
        break;
      }
      case 'magnet': {
        const m = new THREE.Mesh(geo('pkMagnet', () => new THREE.TorusGeometry(1.7, 0.5, 6, 12, Math.PI)), this.symbolMat);
        m.rotation.z = Math.PI;
        const tipMat = new THREE.MeshStandardMaterial({ color: 0xff5e5b, emissive: 0xff5e5b, emissiveIntensity: 2.4, flatShading: true });
        for (const sx of [-1.7, 1.7]) {
          const tip = new THREE.Mesh(geo('pkMagnetTip', () => new THREE.BoxGeometry(1.0, 1.1, 1.0)), tipMat);
          tip.position.set(sx, 0.9, 0);
          this.symbol.add(tip);
        }
        this.symbol.add(m);
        break;
      }
      case 'ghost': {
        const m = new THREE.Mesh(geo('pkGhost', () => { const g = new THREE.SphereGeometry(1.9, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62); return g; }), this.symbolMat);
        m.position.y = 0.4;
        this.symbol.add(m);
        const skirt = new THREE.Mesh(geo('pkGhostSkirt', () => new THREE.ConeGeometry(1.9, 1.6, 8, 1, true)), this.symbolMat);
        skirt.rotation.x = Math.PI;
        skirt.position.y = -0.6;
        this.symbol.add(skirt);
        break;
      }
      case 'mine': {
        const m = new THREE.Mesh(geo('pkMine', () => new THREE.IcosahedronGeometry(1.5, 0)), this.symbolMat);
        this.symbol.add(m);
        const spGeo = geo('pkMineSp', () => { const g = new THREE.ConeGeometry(0.4, 1.2, 4); g.rotateX(Math.PI / 2); return g; });
        for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          const sp = new THREE.Mesh(spGeo, this.symbolMat);
          sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(x, y, z));
          sp.position.set(x * 1.3, y * 1.3, z * 1.3);
          this.symbol.add(sp);
        }
        break;
      }
      case 'decoy': {
        const fuselage = new THREE.Mesh(geo('pkDecoyFus', () => { const g = new THREE.ConeGeometry(0.9, 2.8, 4); g.rotateX(Math.PI / 2); return g; }), this.symbolMat);
        const wings = new THREE.Mesh(geo('pkDecoyWing', () => new THREE.BoxGeometry(3.0, 0.15, 1.2)), this.symbolMat);
        this.symbol.add(fuselage, wings);
        break;
      }
      default: {
        // x2: a pair of spinning diamonds
        for (const sx of [-1.3, 1.3]) {
          const m = new THREE.Mesh(geo('pkX2', () => new THREE.OctahedronGeometry(1.3, 0)), this.symbolMat);
          m.position.x = sx;
          this.symbol.add(m);
        }
      }
    }
    this.group.add(this.symbol);
    this.ring = new THREE.Mesh(geo('pickupRing', () => new THREE.TorusGeometry(6.2, 0.22, 6, 30)), this.ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.group.add(this.ring);
    this.baseY = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.sparkTimer = 0;
  }

  setPosition(x, y, z) {
    this.baseY = y;
    this.group.position.set(x, y, z);
  }

  update(dt, time, particles) {
    this.group.position.y = this.baseY + Math.sin(time * 1.4 + this.phase) * 1.8;
    this.symbol.rotation.y += dt * 2.2;
    this.cage.rotation.y -= dt * 0.7;
    this.cage.rotation.x += dt * 0.4;
    this.ring.rotation.z += dt * 1.5;
    this.ring.rotation.x = Math.PI / 2 + Math.sin(time * 1.1 + this.phase) * 0.35;
    const pulse = 1 + Math.sin(time * 4 + this.phase) * 0.08;
    this.core.scale.setScalar(pulse);
    this.coreMat.emissiveIntensity = 1.9 + Math.sin(time * 4 + this.phase) * 0.5;
    this.sparkTimer -= dt;
    if (particles && this.sparkTimer <= 0) {
      this.sparkTimer = 0.25;
      particles.spawn({
        pos: this.group.position,
        vel: { x: (Math.random() - 0.5) * 5, y: 2 + Math.random() * 3, z: (Math.random() - 0.5) * 5 },
        life: 0.8, size: 0.5, drag: 1.2, colors: powerupPalette(this.type), glow: 2.0,
      });
    }
  }

  dispose() {
    this.coreMat.dispose();
    this.symbolMat.dispose();
    this.ringMat.dispose();
  }
}

// ---------------------------------------------------------------------------
// Sky Mine: hovering proximity mine with pulsing warning spikes
// ---------------------------------------------------------------------------
export class Mine {
  constructor() {
    this.group = new THREE.Group();
    this.mat = new THREE.MeshStandardMaterial({
      color: 0xff3366,
      emissive: 0xff2244,
      emissiveIntensity: 2.2,
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true,
    });
    const core = new THREE.Mesh(geo('mineBody', () => new THREE.IcosahedronGeometry(2.0, 1)), this.mat);
    this.group.add(core);
    const spikeGeo = geo('mineSpike', () => {
      const g = new THREE.ConeGeometry(0.6, 1.5, 4);
      g.rotateX(Math.PI / 2);
      return g;
    });
    for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const sp = new THREE.Mesh(spikeGeo, this.mat);
      sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(x, y, z));
      sp.position.set(x * 1.6, y * 1.6, z * 1.6);
      this.group.add(sp);
    }
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  update(dt, t, armed) {
    this.group.rotation.x += dt * (armed ? 2.5 : 0.8);
    this.group.rotation.y += dt * (armed ? 3.0 : 1.0);
    const pulse = armed ? 3.2 + Math.sin(t * 12) * 2.0 : 1.4 + Math.sin(t * 3) * 0.6;
    this.mat.emissiveIntensity = pulse;
  }

  dispose() {
    this.mat.dispose();
  }
}

// ---------------------------------------------------------------------------
// Meteor (Meteor Shower event): flaming rock with a fire trail
// ---------------------------------------------------------------------------
export class Meteor {
  constructor() {
    this.group = new THREE.Group();
    this.mat = new THREE.MeshStandardMaterial({ color: 0x5a4634, emissive: 0xff5a1a, emissiveIntensity: 2.6, flatShading: true, roughness: 0.9 });
    const rock = new THREE.Mesh(geo('meteorRock', () => new THREE.IcosahedronGeometry(2.6, 0)), this.mat);
    rock.castShadow = true;
    this.group.add(rock);
    this.fireMat = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xff8c2a, emissiveIntensity: 3.2, transparent: true, opacity: 0.85, depthWrite: false });
    const fire = new THREE.Mesh(geo('meteorFire', () => { const g = new THREE.ConeGeometry(1.6, 4.4, 5); g.rotateX(Math.PI / 2); return g; }), this.fireMat);
    fire.position.z = 3.0;
    this.group.add(fire);
    this.trailTimer = 0;
    this.colors = [new THREE.Color(0xfff1a8), new THREE.Color(0xff8c2a), new THREE.Color(0x8a2b0a)];
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  update(dt, particles) {
    this.group.rotation.x += dt * 2.2;
    this.group.rotation.y += dt * 1.6;
    this.trailTimer -= dt;
    if (particles && this.trailTimer <= 0) {
      this.trailTimer = 0.04;
      particles.spawn({
        pos: this.group.position,
        vel: { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 4 },
        life: 0.6, size: 1.4, drag: 1.1, colors: this.colors, glow: 2.2,
      });
    }
  }

  dispose() {
    this.mat.dispose();
    this.fireMat.dispose();
  }
}

// ---------------------------------------------------------------------------
// Boss Blimp: procedural dirigible warship with rotating propellers, gondola,
// searchlight and tail fins.
// ---------------------------------------------------------------------------
export class Blimp {
  constructor() {
    this.group = new THREE.Group();

    // Materials
    this.hullMat = new THREE.MeshStandardMaterial({
      color: 0x3d2645,
      emissive: 0x1f1025,
      emissiveIntensity: 0.6,
      roughness: 0.6,
      metalness: 0.25,
      flatShading: true,
    });
    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd54a,
      emissive: 0xffa020,
      emissiveIntensity: 1.4,
      roughness: 0.4,
      metalness: 0.6,
      flatShading: true,
    });
    this.cabinMat = new THREE.MeshStandardMaterial({
      color: 0x221832,
      roughness: 0.7,
      metalness: 0.3,
      flatShading: true,
    });
    this.windowMat = new THREE.MeshStandardMaterial({
      color: 0xffd54a,
      emissive: 0xffb04a,
      emissiveIntensity: 2.8,
      roughness: 0.3,
    });
    this.finMat = new THREE.MeshStandardMaterial({
      color: 0x8b263e,
      roughness: 0.6,
      flatShading: true,
    });
    this.beaconMat = new THREE.MeshStandardMaterial({
      color: 0xff3344,
      emissive: 0xff2233,
      emissiveIntensity: 3.5,
    });

    // Hull envelope (length ~48m, diameter ~22m along Z axis)
    const envelope = new THREE.Mesh(geo('blimpEnvelope', () => {
      const g = new THREE.SphereGeometry(11, 14, 10);
      g.scale(1, 1, 2.2);
      return g;
    }), this.hullMat);
    envelope.castShadow = true;
    this.group.add(envelope);

    // Gold structural belly & nose bands
    const ring1 = new THREE.Mesh(geo('blimpRing1', () => new THREE.TorusGeometry(10.8, 0.4, 6, 24)), this.goldMat);
    ring1.position.z = -7;
    const ring2 = new THREE.Mesh(geo('blimpRing2', () => new THREE.TorusGeometry(10.8, 0.4, 6, 24)), this.goldMat);
    ring2.position.z = 7;
    this.group.add(ring1, ring2);

    // Nose cap
    const noseCap = new THREE.Mesh(geo('blimpNose', () => {
      const g = new THREE.ConeGeometry(3.5, 5, 8);
      g.rotateX(-Math.PI / 2);
      return g;
    }), this.goldMat);
    noseCap.position.z = -23.5;
    this.group.add(noseCap);

    // Gondola / Cabin underneath
    const gondola = new THREE.Mesh(geo('blimpGondola', () => new THREE.BoxGeometry(5.5, 4.2, 18)), this.cabinMat);
    gondola.position.set(0, -11.5, 2);
    this.group.add(gondola);

    // Glowing observation windows along the gondola flanks
    for (const sx of [-2.85, 2.85]) {
      for (let zi = -5; zi <= 5; zi += 2.5) {
        const win = new THREE.Mesh(geo('blimpWin', () => new THREE.BoxGeometry(0.2, 1.2, 1.4)), this.windowMat);
        win.position.set(sx, -11.2, 2 + zi);
        this.group.add(win);
      }
    }

    // Forward searchlight
    const light = new THREE.Mesh(geo('blimpLight', () => {
      const g = new THREE.CylinderGeometry(1.2, 0.8, 1.5, 8);
      g.rotateX(-Math.PI / 2);
      return g;
    }), this.windowMat);
    light.position.set(0, -11.5, -7.5);
    this.group.add(light);

    // Stabilizer fins (top, bottom, left, right at rear)
    const finShape = geo('blimpFin', () => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(7, -2);
      shape.lineTo(6, -9);
      shape.lineTo(0, -6);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false });
      return g;
    });

    const finTop = new THREE.Mesh(finShape, this.finMat);
    finTop.rotation.y = Math.PI / 2;
    finTop.position.set(0.3, 15, 14);
    const finBottom = new THREE.Mesh(finShape, this.finMat);
    finBottom.rotation.y = Math.PI / 2;
    finBottom.rotation.x = Math.PI;
    finBottom.position.set(0.3, -15, 14);
    const finLeft = new THREE.Mesh(finShape, this.finMat);
    finLeft.rotation.z = Math.PI / 2;
    finLeft.position.set(-15, 0.3, 14);
    const finRight = new THREE.Mesh(finShape, this.finMat);
    finRight.rotation.z = -Math.PI / 2;
    finRight.position.set(15, -0.3, 14);
    this.group.add(finTop, finBottom, finLeft, finRight);

    // Top blinking beacon
    this.beacon = new THREE.Mesh(geo('blimpBeacon', () => new THREE.SphereGeometry(0.8, 8, 6)), this.beaconMat);
    this.beacon.position.set(0, 15.5, 14);
    this.group.add(this.beacon);

    // Engine pods with spinning twin propellers
    this.propellers = [];
    const propGeo = geo('blimpProp', () => {
      const g = new THREE.BoxGeometry(0.4, 4.2, 0.1);
      return g;
    });
    for (const sx of [-13, 13]) {
      const pylon = new THREE.Mesh(geo('blimpPylon', () => new THREE.BoxGeometry(2.5, 0.8, 4)), this.cabinMat);
      pylon.position.set(sx * 0.7, -7, 6);
      const pod = new THREE.Mesh(geo('blimpPod', () => {
        const g = new THREE.CylinderGeometry(1.6, 1.4, 6, 8);
        g.rotateX(Math.PI / 2);
        return g;
      }), this.cabinMat);
      pod.position.set(sx, -7, 6);
      const propGroup = new THREE.Group();
      propGroup.position.set(sx, -7, 9.2);
      const b1 = new THREE.Mesh(propGeo, this.goldMat);
      const b2 = b1.clone(); b2.rotation.z = Math.PI / 2;
      propGroup.add(b1, b2);
      this.propellers.push(propGroup);
      this.group.add(pylon, pod, propGroup);
    }

    this.trailTimer = 0;
    this.smokeColors = [new THREE.Color(0x3a3045), new THREE.Color(0x1a1425), new THREE.Color(0x554860)];
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  setRotation(yaw) {
    this.group.rotation.y = yaw;
  }

  update(dt, t, particles) {
    // Gentle hovering sway
    this.group.rotation.z = Math.sin(t * 0.8) * 0.04;
    this.group.rotation.x = Math.sin(t * 0.6) * 0.03;

    // Propellers spin
    for (const p of this.propellers) p.rotation.z += dt * 18;

    // Flashing beacon
    this.beaconMat.emissiveIntensity = 2.0 + Math.sin(t * 8) * 2.0;

    // Diesel exhaust smoke puffs from rear engine pods
    this.trailTimer -= dt;
    if (particles && this.trailTimer <= 0) {
      this.trailTimer = 0.08;
      for (const sx of [-13, 13]) {
        const back = new THREE.Vector3(sx, -7, 10).applyQuaternion(this.group.quaternion).add(this.group.position);
        particles.spawn({
          pos: back,
          vel: { x: (Math.random() - 0.5) * 4, y: 1 + Math.random() * 2, z: (Math.random() - 0.5) * 4 },
          life: 1.1,
          size: 1.6,
          drag: 1.0,
          colors: this.smokeColors,
          glow: 0.8,
        });
      }
    }
  }

  dispose() {
    this.hullMat.dispose();
    this.goldMat.dispose();
    this.cabinMat.dispose();
    this.windowMat.dispose();
    this.finMat.dispose();
    this.beaconMat.dispose();
  }
}
