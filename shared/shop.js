'use strict';
/*
 * Shared cosmetic shop catalogue, round sponsors and equipment definitions.
 *
 * This file is CommonJS so the server can require() it directly. The server also
 * serves it to the browser as an ES module at GET /js/shop-data.js so there is a
 * single source of truth for cosmetic parameters, pricing and round sponsors.
 */

const SHOP_CATEGORIES = ['wing', 'fuselage', 'finish', 'canopy', 'intake', 'nozzle', 'trail', 'firework', 'voice', 'visor'];

const DEFAULT_EQUIPPED = {
  wing: 'wing_default',
  fuselage: 'fuse_default',
  finish: 'finish_default',
  canopy: 'canopy_default',
  intake: 'intake_default',
  nozzle: 'nozzle_default',
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
    description: 'Experimental flattened circular saucer wing.',
    price: 1500,
    params: { style: 'saucer', radius: 3.2, tube: 0.35 },
  },
  {
    id: 'wing_eurofighter',
    category: 'wing',
    name: 'Typhoon Canard Delta',
    desc: 'Close-coupled foreplane all-moving canards with agile cropped delta wings.',
    description: 'Close-coupled foreplane all-moving canards with agile cropped delta wings.',
    price: 500,
    params: { style: 'eurofighter', canards: true, delta: true },
  },
  {
    id: 'wing_f14',
    category: 'wing',
    name: 'Tomcat Variable Sweep',
    desc: 'Variable-geometry swing wings that automatically sweep back at supersonic speed.',
    description: 'Variable-geometry swing wings that automatically sweep back at supersonic speed.',
    price: 850,
    params: { style: 'f14', swingWing: true, variableSweep: true },
  },
  {
    id: 'wing_f22',
    category: 'wing',
    name: 'Raptor Diamond Stealth',
    desc: 'Clipped diamond trapezoidal stealth planform with canted twin vertical stabilizers.',
    description: 'Clipped diamond trapezoidal stealth planform with canted twin vertical stabilizers.',
    price: 1100,
    params: { style: 'f22', diamond: true, cantedFins: true },
  },
  {
    id: 'wing_su30',
    category: 'wing',
    name: 'Flanker Tandem Triplane',
    desc: 'Tandem triplane configuration pairing LERX canards with swept wings and twin fins.',
    description: 'Tandem triplane configuration pairing LERX canards with swept wings and twin fins.',
    price: 1350,
    params: { style: 'su30', tandemTriplane: true, canards: true, twinTails: true },
  },

  // --- Fuselages ('fuselage') ---
  {
    id: 'fuse_default',
    category: 'fuselage',
    name: 'Standard Monocoque',
    desc: 'Balanced semi-monocoque aerodynamic fuselage with streamlined radome.',
    description: 'Balanced semi-monocoque aerodynamic fuselage with streamlined radome.',
    price: 0,
    params: { style: 'standard' },
  },
  {
    id: 'fuse_needle',
    category: 'fuselage',
    name: 'Mach-3 Needle Dart',
    desc: 'Ultra-slender high-Mach pencil fuselage with extended titanium pitot boom.',
    description: 'Ultra-slender high-Mach pencil fuselage with extended titanium pitot boom.',
    price: 450,
    params: { style: 'needle', slender: true, pitotBoom: true },
  },
  {
    id: 'fuse_lifting',
    category: 'fuselage',
    name: 'Blended Lifting Body',
    desc: 'Flattened lifting-body fuselage with sweeping leading-edge root chine strakes.',
    description: 'Flattened lifting-body fuselage with sweeping leading-edge root chine strakes.',
    price: 700,
    params: { style: 'lifting', chines: true, blended: true },
  },
  {
    id: 'fuse_heavy',
    category: 'fuselage',
    name: 'Armored Titanium Hull',
    desc: 'Reinforced heavy interceptor fuselage with thick armor collars and chisel radome.',
    description: 'Reinforced heavy interceptor fuselage with thick armor collars and chisel radome.',
    price: 950,
    params: { style: 'heavy', armored: true, collars: 3 },
  },
  {
    id: 'fuse_stealth',
    category: 'fuselage',
    name: 'Faceted Diamond Stealth',
    desc: 'Low-observable faceted diamond cross-section with razor waterline chines.',
    description: 'Low-observable faceted diamond cross-section with razor waterline chines.',
    price: 1300,
    params: { style: 'stealth', faceted: true, diamondHull: true },
  },
  {
    id: 'fuse_cyber',
    category: 'fuselage',
    name: 'Quantum Railframe',
    desc: 'Sci-fi carbon exoskeleton exposing an illuminated pulsing quantum conduit spine.',
    description: 'Sci-fi carbon exoskeleton exposing an illuminated pulsing quantum conduit spine.',
    price: 1750,
    params: { style: 'cyber', illuminatedSpine: true, exoRibs: 4 },
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

  // --- Canopies ('canopy') ---
  {
    id: 'canopy_default',
    category: 'canopy',
    name: 'Standard Aero Bubble',
    desc: 'Factory aerodynamic teardrop cockpit glass.',
    description: 'Factory aerodynamic teardrop cockpit glass.',
    price: 0,
    params: { style: 'default' },
  },
  {
    id: 'canopy_amber',
    category: 'canopy',
    name: 'Solar Gold Amber',
    desc: 'High-contrast polarized solar gold glass with mirror sheen.',
    description: 'High-contrast polarized solar gold glass with mirror sheen.',
    price: 300,
    params: { style: 'amber', tint: 0xffb326, metallic: true },
  },
  {
    id: 'canopy_stealth',
    category: 'canopy',
    name: 'Stealth Chisel',
    desc: 'Angular radar-absorbent faceted glass with smoked obsidian hue.',
    description: 'Angular radar-absorbent faceted glass with smoked obsidian hue.',
    price: 500,
    params: { style: 'stealth', faceted: true, tint: 0x1a1626 },
  },
  {
    id: 'canopy_bubble',
    category: 'canopy',
    name: 'Panoramic Bubble Dome',
    desc: 'Blown panoramic teardrop bubble providing seamless 360 cockpit visibility.',
    description: 'Blown panoramic teardrop bubble providing seamless 360 cockpit visibility.',
    price: 750,
    params: { style: 'bubble', panoramic: true, tint: 0x40e0d0 },
  },
  {
    id: 'canopy_cage',
    category: 'canopy',
    name: 'Baron Birdcage Greenhouse',
    desc: 'Vintage heavy-frame interceptor canopy with metal structural cage ribs.',
    description: 'Vintage heavy-frame interceptor canopy with metal structural cage ribs.',
    price: 950,
    params: { style: 'cage', framed: true, ribs: 3, tint: 0x2aff88 },
  },
  {
    id: 'canopy_holo',
    category: 'canopy',
    name: 'Cyberpunk Neon HUD',
    desc: 'Translucent magenta hard-light canopy with floating digital HUD reticle projection.',
    description: 'Translucent magenta hard-light canopy with floating digital HUD reticle projection.',
    price: 1400,
    params: { style: 'holo', reticle: true, tint: 0xff2a9d, emissiveIntensity: 1.6 },
  },

  // --- Engine Intakes ('intake') ---
  {
    id: 'intake_default',
    category: 'intake',
    name: 'Twin Wedge Scoops',
    desc: 'Classic lateral rectangular wedge air scoops with angled compression ramps.',
    description: 'Classic lateral rectangular wedge air scoops with angled compression ramps.',
    price: 0,
    params: { style: 'wedge' },
  },
  {
    id: 'intake_ramjet',
    category: 'intake',
    name: 'SR-71 Conical Spikes',
    desc: 'Supersonic circular nacelle cowls with protruding titanium shock cones.',
    description: 'Supersonic circular nacelle cowls with protruding titanium shock cones.',
    price: 350,
    params: { style: 'ramjet', spikes: true },
  },
  {
    id: 'intake_viper',
    category: 'intake',
    name: 'Viper Ventral Scoop',
    desc: 'Wide ventral belly scoop mounted beneath the fuselage with chin splitter shelf.',
    description: 'Wide ventral belly scoop mounted beneath the fuselage with chin splitter shelf.',
    price: 550,
    params: { style: 'viper', ventral: true },
  },
  {
    id: 'intake_splitters',
    category: 'intake',
    name: 'Flanker DSI Bumpers',
    desc: 'Canted diverterless supersonic intake boxes with razor splitter boundary plates.',
    description: 'Canted diverterless supersonic intake boxes with razor splitter boundary plates.',
    price: 800,
    params: { style: 'dsi', splitters: true },
  },
  {
    id: 'intake_turbine',
    category: 'intake',
    name: 'Titanium Fan Turbines',
    desc: 'High-bypass circular turbojet ducts exposing visible spinning multi-blade turbine disks.',
    description: 'High-bypass circular turbojet ducts exposing visible spinning multi-blade turbine disks.',
    price: 1100,
    params: { style: 'turbine', blades: 12 },
  },
  {
    id: 'intake_plasma',
    category: 'intake',
    name: 'Quantum Plasma Ram-Scoops',
    desc: 'Sci-fi magnetic induction scoops with high-intensity glowing cyan plasma ion rings.',
    description: 'Sci-fi magnetic induction scoops with high-intensity glowing cyan plasma ion rings.',
    price: 1500,
    params: { style: 'plasma', ionRings: true, color: 0x4ff1ff },
  },

  // --- Engine Nozzles ('nozzle') ---
  {
    id: 'nozzle_default',
    category: 'nozzle',
    name: 'Titanium Iris Petals',
    desc: 'Articulated convergent-divergent titanium exhaust petals with heated throat ring.',
    description: 'Articulated convergent-divergent titanium exhaust petals with heated throat ring.',
    price: 0,
    params: { style: 'iris', petals: 12 },
  },
  {
    id: 'nozzle_vector',
    category: 'nozzle',
    name: '3D Thrust-Vectoring Paddles',
    desc: 'Multi-axis rectangular thrust-vectoring paddles mounted around the nozzle rim.',
    description: 'Multi-axis rectangular thrust-vectoring paddles mounted around the nozzle rim.',
    price: 400,
    params: { style: 'vector', paddles: 4 },
  },
  {
    id: 'nozzle_twin',
    category: 'nozzle',
    name: 'Dual Afterburner Pods',
    desc: 'Twin side-by-side exhaust cowls with dual synchronized high-thrust afterburner plumes.',
    description: 'Twin side-by-side exhaust cowls with dual synchronized high-thrust afterburner plumes.',
    price: 650,
    params: { style: 'twin', dualBurner: true },
  },
  {
    id: 'nozzle_aerospike',
    category: 'nozzle',
    name: 'Linear Aerospike Torus',
    desc: 'Annular aerospike plug nozzle projecting an electric violet/cyan plasma cone.',
    description: 'Annular aerospike plug nozzle projecting an electric violet/cyan plasma cone.',
    price: 900,
    params: { style: 'aerospike', spikePlug: true },
  },
  {
    id: 'nozzle_stealth',
    category: 'nozzle',
    name: 'Serrated Stealth Chevrons',
    desc: 'Acoustic sawtooth chevron petals in radar-absorbent ceramic with gold heat-shield.',
    description: 'Acoustic sawtooth chevron petals in radar-absorbent ceramic with gold heat-shield.',
    price: 1200,
    params: { style: 'stealth', chevrons: 8 },
  },
  {
    id: 'nozzle_warp',
    category: 'nozzle',
    name: 'Hyperdrive Singularity Ring',
    desc: 'Concentric floating neon magnetic acceleration rings focusing a quantum ion jet.',
    description: 'Concentric floating neon magnetic acceleration rings focusing a quantum ion jet.',
    price: 1600,
    params: { style: 'warp', plasmaRings: 3 },
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

for (const it of SHOP_ITEMS) {
  if (!it.description) it.description = it.desc;
  if (!it.desc) it.desc = it.description;
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
