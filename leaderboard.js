'use strict';
/*
 * Persistent all-time leaderboard, stored as JSON at data/leaderboard.json
 * (override with LEADERBOARD_FILE). Written atomically: temp file + rename,
 * so a crash mid-write can never leave a half-written file behind.
 *
 * Entries are keyed per (player name, pilot) and per game mode.
 */
const fs = require('fs');
const path = require('path');
const { DEFAULT_EQUIPPED, itemById, sponsorById } = require('./shared/shop');

const MODES = ['crown', 'blitz', 'race', 'teams', 'boss'];

function emptyBoard() {
  return { version: 1, updatedAt: null, modes: { crown: {}, blitz: {}, race: {}, teams: {}, boss: {} }, wallets: {} };
}

function emptyEntry(name, pilot) {
  return { name, pilot, wins: 0, rounds: 0, bestScore: 0, totalPoints: 0, balloons: 0, hits: 0, lastPlayed: null };
}

function emptyWallet(displayName) {
  const raw = (displayName || '').trim();
  return {
    displayName: raw || 'Pilot',
    credits: 0,
    lifetimeCredits: 0,
    unlocked: Object.values(DEFAULT_EQUIPPED),
    equipped: { ...DEFAULT_EQUIPPED },
    updatedAt: new Date().toISOString(),
  };
}

class Leaderboard {
  constructor(file) {
    this.file = file || process.env.LEADERBOARD_FILE || path.join(__dirname, 'data', 'leaderboard.json');
    this.board = emptyBoard();
    this.writeQueue = Promise.resolve();
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.file)) {
        this.board = emptyBoard();
        this.saveSync();
        console.log(`[leaderboard] created ${this.file}`);
        return;
      }
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.modes) throw new Error('unexpected shape');
      this.board = emptyBoard();
      for (const mode of MODES) {
        const src = parsed.modes[mode];
        if (src && typeof src === 'object') this.board.modes[mode] = src;
      }
      this.board.wallets = (parsed.wallets && typeof parsed.wallets === 'object') ? parsed.wallets : {};
      this.board.updatedAt = parsed.updatedAt || null;
      const n = MODES.reduce((s, m) => s + Object.keys(this.board.modes[m]).length, 0);
      const w = Object.keys(this.board.wallets).length;
      console.log(`[leaderboard] loaded ${n} entries, ${w} wallets from ${this.file}`);
    } catch (err) {
      // A corrupt file is moved aside rather than overwritten so nothing is lost.
      console.warn(`[leaderboard] could not read ${this.file}: ${err.message} - starting fresh`);
      try {
        if (fs.existsSync(this.file)) fs.renameSync(this.file, `${this.file}.corrupt-${Date.now()}`);
      } catch (e2) {
        console.warn(`[leaderboard] could not move corrupt file aside: ${e2.message}`);
      }
      this.board = emptyBoard();
      this.saveSync();
    }
  }

  saveSync() {
    const dir = path.dirname(this.file);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.board, null, 2));
    fs.renameSync(tmp, this.file);
  }

  /** Serialised async save; concurrent round ends never interleave writes. */
  save() {
    const snapshot = JSON.stringify(this.board, null, 2);
    this.writeQueue = this.writeQueue
      .then(async () => {
        const dir = path.dirname(this.file);
        await fs.promises.mkdir(dir, { recursive: true });
        const tmp = `${this.file}.${process.pid}.tmp`;
        await fs.promises.writeFile(tmp, snapshot);
        await fs.promises.rename(tmp, this.file);
      })
      .catch((err) => console.error(`[leaderboard] save failed: ${err.message}`));
    return this.writeQueue;
  }

  static key(name, pilot) { return `${name}::${pilot}`; }

  /**
   * Record one finished round for a list of human players.
   * results: [{ name, pilot, score, points, balloons, hits, won }]
   * Returns a map name::pilot -> array of personal-best labels achieved this round.
   */
  recordRound(mode, results) {
    if (!MODES.includes(mode)) return {};
    const table = this.board.modes[mode];
    const bests = {};
    const stamp = new Date().toISOString();
    for (const r of results) {
      const key = Leaderboard.key(r.name, r.pilot);
      const prev = table[key] || emptyEntry(r.name, r.pilot);
      const achieved = [];
      const score = Math.max(0, Math.round(r.score || 0));
      if (prev.rounds === 0) achieved.push('First round on the board');
      if (score > prev.bestScore && prev.rounds > 0) achieved.push(`New best score (${score}, was ${prev.bestScore})`);
      if (r.won && prev.wins === 0) achieved.push('First win!');
      const entry = {
        ...prev,
        name: r.name,
        pilot: r.pilot,
        wins: prev.wins + (r.won ? 1 : 0),
        rounds: prev.rounds + 1,
        bestScore: Math.max(prev.bestScore, score),
        totalPoints: Math.round((prev.totalPoints + (r.points || 0)) * 10) / 10,
        balloons: prev.balloons + (r.balloons || 0),
        hits: prev.hits + (r.hits || 0),
        lastPlayed: stamp,
      };
      table[key] = entry;
      bests[key] = achieved;
    }
    this.board.updatedAt = stamp;
    this.save();
    return bests;
  }

  /** Top N entries for a mode, sorted by wins, then best score, then total points. */
  top(mode, n = 10) {
    const table = this.board.modes[mode] || {};
    return Object.values(table)
      .sort((a, b) => b.wins - a.wins || b.bestScore - a.bestScore || b.totalPoints - a.totalPoints || a.name.localeCompare(b.name))
      .slice(0, n)
      .map((e, i) => ({ rank: i + 1, ...e }));
  }

  // -------------------------------------------------------------------------
  // Player Wallets (Sky Credits & Cosmetics)
  // -------------------------------------------------------------------------
  static normalizeName(name) {
    return (name || '').trim().toLowerCase();
  }

  getOrCreateWallet(playerName) {
    const raw = (playerName || '').trim();
    if (!raw) return null;
    const key = Leaderboard.normalizeName(raw);
    if (!this.board.wallets) this.board.wallets = {};
    let w = this.board.wallets[key];
    if (!w) {
      w = emptyWallet(raw);
      this.board.wallets[key] = w;
      this.save();
    } else {
      w.displayName = raw;
      if (!Array.isArray(w.unlocked)) {
        w.unlocked = Object.values(DEFAULT_EQUIPPED);
      } else {
        for (const defId of Object.values(DEFAULT_EQUIPPED)) {
          if (!w.unlocked.includes(defId)) w.unlocked.push(defId);
        }
      }
      if (!w.equipped || typeof w.equipped !== 'object') {
        w.equipped = { ...DEFAULT_EQUIPPED };
      } else {
        for (const [cat, defId] of Object.entries(DEFAULT_EQUIPPED)) {
          if (!w.equipped[cat]) w.equipped[cat] = defId;
        }
      }
      if (typeof w.credits !== 'number') w.credits = 0;
      if (typeof w.lifetimeCredits !== 'number') w.lifetimeCredits = w.credits;
    }
    return w;
  }

  awardCredits(playerName, amount) {
    const w = this.getOrCreateWallet(playerName);
    if (!w) return null;
    const amt = Math.max(0, Math.round(Number(amount) || 0));
    w.credits += amt;
    w.lifetimeCredits += amt;
    const stamp = new Date().toISOString();
    w.updatedAt = stamp;
    this.board.updatedAt = stamp;
    this.save();
    return w;
  }

  purchaseItem(playerName, itemId) {
    const item = itemById(itemId);
    if (!item) return { ok: false, error: 'Item not found' };
    const w = this.getOrCreateWallet(playerName);
    if (!w) return { ok: false, error: 'Invalid player name' };
    if (w.unlocked.includes(itemId)) return { ok: false, error: 'Item already unlocked' };
    if (w.credits < item.price) return { ok: false, error: 'Insufficient Sky Credits' };

    w.credits -= item.price;
    w.unlocked.push(itemId);
    w.equipped[item.category] = itemId;
    const stamp = new Date().toISOString();
    w.updatedAt = stamp;
    this.board.updatedAt = stamp;
    this.save();
    return { ok: true, wallet: w, item };
  }

  equipItem(playerName, itemId) {
    const item = itemById(itemId);
    if (!item) return { ok: false, error: 'Item not found' };
    const w = this.getOrCreateWallet(playerName);
    if (!w) return { ok: false, error: 'Invalid player name' };
    if (!w.unlocked.includes(itemId)) return { ok: false, error: 'Item not unlocked' };

    w.equipped[item.category] = itemId;
    const stamp = new Date().toISOString();
    w.updatedAt = stamp;
    this.board.updatedAt = stamp;
    this.save();
    return { ok: true, wallet: w, item };
  }

  spendCreditsForSponsor(playerName, sponsorId) {
    const sponsor = sponsorById(sponsorId);
    if (!sponsor) return { ok: false, error: 'Sponsor not found' };
    const w = this.getOrCreateWallet(playerName);
    if (!w) return { ok: false, error: 'Invalid player name' };
    if (w.credits < sponsor.cost) return { ok: false, error: 'Insufficient Sky Credits' };

    w.credits -= sponsor.cost;
    const stamp = new Date().toISOString();
    w.updatedAt = stamp;
    this.board.updatedAt = stamp;
    this.save();
    return { ok: true, wallet: w, sponsor };
  }

  summary(n = 10) {
    const modes = {};
    const totals = {};
    for (const m of MODES) {
      modes[m] = this.top(m, n);
      totals[m] = Object.keys(this.board.modes[m] || {}).length;
    }
    totals.wallets = Object.keys(this.board.wallets || {}).length;
    return {
      updatedAt: this.board.updatedAt,
      file: path.basename(this.file),
      modes,
      totals,
    };
  }
}

module.exports = { Leaderboard };
