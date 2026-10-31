'use strict';
/*
 * Shared cosmetic shop catalogue, round sponsors and equipment definitions.
 *
 * This file is CommonJS so the server can require() it directly. The server also
 * serves it to the browser as an ES module at GET /js/shop-data.js so there is a
 * single source of truth for cosmetic parameters, pricing and round sponsors.
 */

const SHOP_CATEGORIES = ['wing', 'finish', 'trail', 'firework', 'voice', 'visor'];

const DEFAULT_EQUIPPED = {
  wing: 'wing_default',
  finish: 'finish_default',
  trail: 'trail_default',
  firework: 'fw_default',
  voice: 'voice_default',
  visor: 'visor_default',
};

const SHOP_ITEMS = [
  // --- Wings ('wing') ---
  {
    id: 'wing_default',
    category: 'wing',
    name: 'Standard Delta',
    desc: 'Factory standard swept delta wing profile.',
    price: 0,
    params: { style: 'delta' },
  },
  {
    id: 'wing_xwing',
    category: 'wing',
    name: 'Forward X-Sweep',
    desc: 'Forward-swept aero wings with responsive canards.',
    price: 400,
    params: { style: 'xwing', canards: true, sweepAngle: -0.35 },
  },
  {
    id: 'wing_triplane',
    category: 'wing',
    name: 'Baron Tri-Deck',
    desc: 'Three stacked wing decks with vintage bracing struts.',
    price: 600,
    params: { style: 'triplane', decks: 3, struts: true },
  },
  {
    id: 'wing_twinboom',
    category: 'wing',
    name: 'Twin-Boom Interceptor',
    desc: 'Dual tail booms with high-mounted horizontal stabilizer.',
    price: 800,
    params: { style: 'twinboom', booms: 2, twinTail: true },
  },
  {
    id: 'wing_saucer',
    category: 'wing',
    name: 'Area-51 Disc',
    desc: 'Experimental flattened circular saucer wing.',
    price: 1500,
    params: { style: 'saucer', radius: 3.2, tube: 0.35 },
  },

  // --- Finishes ('finish') ---
  {
    id: 'finish_default',
    category: 'finish',
    name: 'Factory Gloss',
    desc: 'Clean high-gloss aircraft enamel.',
    price: 0,
    params: { type: 'gloss', metalness: 0.1, roughness: 0.4 },
  },
  {
    id: 'finish_chrome',
    category: 'finish',
    name: 'Liquid Chrome',
    desc: 'Mirror-polished chrome with razor reflections.',
    price: 500,
    params: { type: 'chrome', metalness: 0.95, roughness: 0.08 },
  },
  {
    id: 'finish_synth',
    category: 'finish',
    name: 'Synthwave Wireframe',
    desc: 'Glowing wireframe grid overlay in pilot accent color.',
    price: 750,
    params: { type: 'wireframe', emissiveIntensity: 0.85, wireframe: true },
  },
  {
    id: 'finish_holo',
    category: 'finish',
    name: 'Hard-Light Hologram',
    desc: 'Semi-transparent pulsing emissive hard-light projection.',
    price: 1200,
    params: { type: 'hologram', transparent: true, opacity: 0.72, pulse: true },
  },
  {
    id: 'finish_gold',
    category: 'finish',
    name: '24K Gold Bullion',
    desc: 'Pure metallic gold hull override with brilliant sparkles.',
    price: 2500,
    params: { type: 'gold', color: 0xffd700, metalness: 0.9, roughness: 0.2, sparkle: true },
  },

  // --- Contrails ('trail') ---
  {
    id: 'trail_default',
    category: 'trail',
    name: 'Vapor Ribbon',
    desc: 'Classic aerodynamic wingtip vapor ribbon.',
    price: 0,
    params: { style: 'ribbon' },
  },
  {
    id: 'trail_voxel',
    category: 'trail',
    name: '8-Bit Cubes',
    desc: 'Blocky retro pixel cubes floating in your wake.',
    price: 350,
    params: { style: 'voxel', size: 0.6 },
  },
  {
    id: 'trail_rings',
    category: 'trail',
    name: 'Plasma Donut Rings',
    desc: 'Glowing toroidal plasma vortex rings pulsing behind you.',
    price: 600,
    params: { style: 'rings', ringRadius: 0.9 },
  },
  {
    id: 'trail_rainbow',
    category: 'trail',
    name: 'Prismatic Rainbow',
    desc: 'Continuous six-color spectral rainbow contrail.',
    price: 900,
    params: { style: 'rainbow', rainbow: true },
  },
  {
    id: 'trail_lightning',
    category: 'trail',
    name: 'Afterburner Lightning',
    desc: 'Crackling electric arcs branching through the contrail.',
    price: 1400,
    params: { style: 'lightning', electric: true },
  },

  // --- Firework Warheads ('firework') ---
  {
    id: 'fw_default',
    category: 'firework',
    name: 'Standard Burst',
    desc: 'Classic celebratory firework explosion.',
    price: 0,
    params: { type: 'sphere', particleCount: 24 },
  },
  {
    id: 'fw_saturn',
    category: 'firework',
    name: 'Double Saturn Ring',
    desc: 'Explodes into two concentric planetary dust rings.',
    price: 300,
    params: { type: 'rings', rings: 2, ringRadius: 6 },
  },
  {
    id: 'fw_spiral',
    category: 'firework',
    name: 'Screaming Spiral',
    desc: 'Pinwheel fireworks spinning into a vortex galaxy.',
    price: 550,
    params: { type: 'spiral', arms: 3 },
  },
  {
    id: 'fw_hearts',
    category: 'firework',
    name: 'Heart Burst',
    desc: 'Vivid pink and gold heart-shaped burst.',
    price: 800,
    params: { type: 'heart', color: 0xff3377 },
  },

  // --- Emote Voices / Horns ('voice') ---
  {
    id: 'voice_default',
    category: 'voice',
    name: 'Standard Comms Chirp',
    desc: 'Cockpit radio squelch and procedural pilot chatter.',
    price: 0,
    params: { synth: 'chirp', basePitch: 1.0 },
  },
  {
    id: 'voice_chiptune',
    category: 'voice',
    name: '8-Bit Arpeggio',
    desc: 'Crisp square-wave retro arcade fanfare.',
    price: 250,
    params: { synth: 'chiptune', wave: 'square' },
  },
  {
    id: 'voice_dreadnought',
    category: 'voice',
    name: 'Sub-Bass Dreadnought Horn',
    desc: 'Massive acoustic sub-bass foghorn reverberation.',
    price: 500,
    params: { synth: 'dreadnought', wave: 'sawtooth', subBass: 55 },
  },
  {
    id: 'voice_sonar',
    category: 'voice',
    name: 'Dolphin Sonar Ping',
    desc: 'High-frequency acoustic maritime sonar ping with echo.',
    price: 650,
    params: { synth: 'sonar', pingFreq: 2400 },
  },

  // --- Portrait Visors ('visor') ---
  {
    id: 'visor_default',
    category: 'visor',
    name: 'Standard Visor',
    desc: 'Pilot helmet standard tinted flight visor.',
    price: 0,
    params: { style: 'standard' },
  },
  {
    id: 'visor_shades',
    category: 'visor',
    name: 'Aviator Mirror Shades',
    desc: 'Classic Top Gun aviator sunglasses with chrome reflection.',
    price: 300,
    params: { style: 'shades', reflective: true },
  },
  {
    id: 'visor_led',
    category: 'visor',
    name: 'Cyberpunk LED Matrix',
    desc: 'Scrolling glowing LED pixel matrix visor.',
    price: 600,
    params: { style: 'led', matrix: true },
  },
  {
    id: 'visor_laurel',
    category: 'visor',
    name: 'Golden Ace Laurels',
    desc: 'Gilded Roman champion laurels crowning your helmet.',
    price: 1000,
    params: { style: 'laurel', golden: true },
  },
];

const ROUND_SPONSORS = [
  {
    id: 'sponsor_double_event',
    name: 'Double Trouble Events',
    desc: 'Triggers 2 mid-round events at 1/3 and 2/3 round marks for the whole lobby.',
    cost: 150,
    effect: 'double_event',
  },
  {
    id: 'sponsor_crate_rain',
    name: 'Orb Overload',
    desc: 'Doubles active power-up orbs in the sky for the round for all pilots.',
    cost: 150,
    effect: 'crate_rain',
  },
  {
    id: 'sponsor_golden_skies',
    name: 'Golden Hour',
    desc: 'Forces sunset golden lighting and grants all human pilots +25% bonus credits at round end.',
    cost: 100,
    effect: 'golden_skies',
  },
];

function itemById(id) {
  return SHOP_ITEMS.find((it) => it.id === id) || null;
}

function itemsByCategory(category) {
  return SHOP_ITEMS.filter((it) => it.category === category);
}

function sponsorById(id) {
  return ROUND_SPONSORS.find((sp) => sp.id === id) || null;
}

function isDefaultItem(id) {
  return Object.values(DEFAULT_EQUIPPED).includes(id);
}

const api = {
  SHOP_CATEGORIES,
  DEFAULT_EQUIPPED,
  SHOP_ITEMS,
  ROUND_SPONSORS,
  itemById,
  itemsByCategory,
  sponsorById,
  isDefaultItem,
};

/** Render this module as browser ES-module source. */
function toEsModuleSource() {
  return [
    '// Generated by the server from shared/shop.js - single source of truth for shop items and sponsors.',
    `export const SHOP_CATEGORIES = ${JSON.stringify(SHOP_CATEGORIES)};`,
    `export const DEFAULT_EQUIPPED = ${JSON.stringify(DEFAULT_EQUIPPED)};`,
    `export const SHOP_ITEMS = ${JSON.stringify(SHOP_ITEMS)};`,
    `export const ROUND_SPONSORS = ${JSON.stringify(ROUND_SPONSORS)};`,
    `export ${itemById.toString()}`,
    `export ${itemsByCategory.toString()}`,
    `export ${sponsorById.toString()}`,
    `export ${isDefaultItem.toString()}`,
  ].join('\n') + '\n';
}
api.toEsModuleSource = toEsModuleSource;

module.exports = api;
