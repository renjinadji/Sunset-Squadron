// audio.js - procedural Web Audio synthesizer. No .mp3/.wav files anywhere.
// initAndUnlock() must be called from a user gesture (LAUNCH JET button) for iOS Safari.

const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, B5: 987.77, D6: 1174.66 };

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.unlocked = false;
    this.engine = null;
    this.muted = false;
    this.lastWarningBeepAt = 0;
  }

  initAndUnlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!this.ctx) {
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -12;
      this.compressor.ratio.value = 4;
      this.master.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
      this.noiseBuffer = this._makeNoiseBuffer(2.0);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    // Play a silent buffer inside the gesture so iOS lets audio through later
    const src = this.ctx.createBufferSource();
    src.buffer = this.ctx.createBuffer(1, 1, 22050);
    src.connect(this.ctx.destination);
    src.start(0);
    this.unlocked = true;
    this._startEngine();
    return true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  _makeNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _noiseSource(loop = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = loop;
    return src;
  }

  // ---------------- continuous jet engine hum ----------------
  _startEngine() {
    if (this.engine || !this.ctx) return;
    const ctx = this.ctx;
    const noise = this._noiseSource(true);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 140;
    band.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    // Low rumble oscillator layered under the noise for body
    const rumble = ctx.createOscillator();
    rumble.type = 'sawtooth';
    rumble.frequency.value = 48;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 180;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.0;
    noise.connect(band).connect(gain).connect(this.master);
    rumble.connect(rumbleFilter).connect(rumbleGain).connect(this.master);
    noise.start();
    rumble.start();
    this.engine = { band, gain, rumble, rumbleGain };
  }

  /** speed01: 0..1 normalised jet speed, called every frame. */
  updateEngine(speed01, active) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    const k = Math.max(0, Math.min(1, speed01));
    const freq = 140 + k * 380;
    this.engine.band.frequency.setTargetAtTime(freq, t, 0.08);
    this.engine.gain.gain.setTargetAtTime(active ? 0.10 + k * 0.16 : 0, t, 0.1);
    this.engine.rumble.frequency.setTargetAtTime(42 + k * 40, t, 0.1);
    this.engine.rumbleGain.gain.setTargetAtTime(active ? 0.05 + k * 0.08 : 0, t, 0.1);
  }

  // ---------------- one-shots ----------------
  _env(gainNode, t, peak, attack, decay) {
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  fireworkLaunch(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const type of ['sawtooth', 'triangle']) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(950, t + 0.18);
      const g = ctx.createGain();
      this._env(g, t, 0.12 * volume, 0.01, 0.22);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.3);
    }
    const hiss = this._noiseSource(false);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const hg = ctx.createGain();
    this._env(hg, t, 0.09 * volume, 0.01, 0.3);
    hiss.connect(hp).connect(hg).connect(this.master);
    hiss.start(t);
    hiss.stop(t + 0.35);
  }

  fireworkPop(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    const sg = ctx.createGain();
    this._env(sg, t, 0.5 * volume, 0.005, 0.32);
    sub.connect(sg).connect(this.master);
    sub.start(t);
    sub.stop(t + 0.4);
    const crackle = this._noiseSource(false);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const cg = ctx.createGain();
    this._env(cg, t, 0.25 * volume, 0.005, 0.28);
    crackle.connect(hp).connect(cg).connect(this.master);
    crackle.start(t);
    crackle.stop(t + 0.35);
    // Sparkle tail
    for (let i = 0; i < 5; i++) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 1400 + Math.random() * 2200;
      const g = ctx.createGain();
      const st = t + 0.05 + Math.random() * 0.25;
      this._env(g, st, 0.05 * volume, 0.005, 0.12);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.2);
    }
  }

  /** Arpeggiated major-9th chime: C5 -> E5 -> G5 -> B5 -> D6 */
  fanfare(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const notes = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.B5, NOTE.D6];
    notes.forEach((f, i) => {
      const st = t + i * 0.085;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.22 * volume, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.9);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 1.0);
      // Soft octave shimmer
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = f * 2;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, st);
      g2.gain.exponentialRampToValueAtTime(0.06 * volume, st + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, st + 0.6);
      o2.connect(g2).connect(this.master);
      o2.start(st);
      o2.stop(st + 0.7);
    });
  }

  /** Short chime for balloon pops (two quick notes). */
  balloonPop(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const crackle = this._noiseSource(false);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3000;
    bp.Q.value = 0.8;
    const cg = ctx.createGain();
    this._env(cg, t, 0.3 * volume, 0.003, 0.12);
    crackle.connect(bp).connect(cg).connect(this.master);
    crackle.start(t);
    crackle.stop(t + 0.15);
    [NOTE.G5, NOTE.D6].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      this._env(g, t + i * 0.07, 0.14 * volume, 0.01, 0.3);
      o.connect(g).connect(this.master);
      o.start(t + i * 0.07);
      o.stop(t + i * 0.07 + 0.35);
    });
  }

  /** Playful shield bump when touching an island. */
  bump(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.18);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const g = ctx.createGain();
    this._env(g, t, 0.28 * volume, 0.005, 0.22);
    o.connect(lp).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.25);
    const wob = ctx.createOscillator();
    wob.type = 'sine';
    wob.frequency.setValueAtTime(600, t);
    wob.frequency.exponentialRampToValueAtTime(300, t + 0.12);
    const wg = ctx.createGain();
    this._env(wg, t, 0.12 * volume, 0.005, 0.15);
    wob.connect(wg).connect(this.master);
    wob.start(t);
    wob.stop(t + 0.2);
  }

  /** Water splash: low-passed noise swoosh. */
  splash(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this._noiseSource(false);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(2400, t + 0.15);
    lp.frequency.exponentialRampToValueAtTime(300, t + 0.5);
    const g = ctx.createGain();
    this._env(g, t, 0.3 * volume, 0.03, 0.5);
    n.connect(lp).connect(g).connect(this.master);
    n.start(t);
    n.stop(t + 0.6);
  }

  /** Afterburner ignite whoosh when boost starts. */
  boostWhoosh(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this._noiseSource(false);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(1600, t + 0.35);
    bp.Q.value = 2;
    const g = ctx.createGain();
    this._env(g, t, 0.22 * volume, 0.05, 0.4);
    n.connect(bp).connect(g).connect(this.master);
    n.start(t);
    n.stop(t + 0.5);
  }

  /** Barrel-roll swoosh: quick pitch-bent sine. */
  rollSwoosh(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(500, t);
    o.frequency.exponentialRampToValueAtTime(1100, t + 0.2);
    o.frequency.exponentialRampToValueAtTime(450, t + 0.45);
    const g = ctx.createGain();
    this._env(g, t, 0.12 * volume, 0.02, 0.45);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.5);
  }

  /** Countdown tick / round-start blip. */
  blip(freq = 880, volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const g = ctx.createGain();
    this._env(g, t, 0.1 * volume, 0.005, 0.12);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.15);
  }

  /** Power-up collected: quick rising arpeggio, pitched per type, with a sparkle tail. */
  pickup(type = 'turbo', volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const bases = { turbo: 440, shield: 392, rapid: 523.25, magnet: 349.23, ghost: 311.13, x2: 587.33, mine: 329.63, decoy: 493.88 };
    const base = bases[type] || 440;
    const ratios = type === 'ghost' ? [1, 1.189, 1.414, 1.682] : type === 'mine' ? [1, 0.9, 1.2, 0.8] : [1, 1.25, 1.5, 2];
    ratios.forEach((r, i) => {
      const st = t + i * 0.06;
      const o = ctx.createOscillator();
      o.type = type === 'shield' ? 'sine' : type === 'mine' ? 'sawtooth' : 'triangle';
      o.frequency.value = base * r;
      const g = ctx.createGain();
      this._env(g, st, 0.16 * volume, 0.008, 0.35);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.4);
    });
    const shimmer = this._noiseSource(false);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2500, t);
    bp.frequency.exponentialRampToValueAtTime(6000, t + 0.3);
    bp.Q.value = 3;
    const sg = ctx.createGain();
    this._env(sg, t, 0.07 * volume, 0.02, 0.35);
    shimmer.connect(bp).connect(sg).connect(this.master);
    shimmer.start(t);
    shimmer.stop(t + 0.4);
  }

  /** Sky mine deployed behind jet: low mechanical release and armed beep. */
  mineDeploy(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(260, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.15);
    const g = ctx.createGain();
    this._env(g, t, 0.18 * volume, 0.005, 0.18);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.2);
    // Short arming chirp
    const chirp = ctx.createOscillator();
    chirp.type = 'sine';
    chirp.frequency.setValueAtTime(880, t + 0.12);
    chirp.frequency.setValueAtTime(1174, t + 0.18);
    const cg = ctx.createGain();
    this._env(cg, t + 0.12, 0.12 * volume, 0.003, 0.12);
    chirp.connect(cg).connect(this.master);
    chirp.start(t + 0.12);
    chirp.stop(t + 0.25);
  }

  /** Decoy deployed: jet launch flare swoosh. */
  decoyDeploy(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this._noiseSource(false);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(600, t);
    bp.frequency.exponentialRampToValueAtTime(2800, t + 0.25);
    bp.Q.value = 2.5;
    const ng = ctx.createGain();
    this._env(ng, t, 0.2 * volume, 0.01, 0.3);
    n.connect(bp).connect(ng).connect(this.master);
    n.start(t);
    n.stop(t + 0.35);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.2);
    const g = ctx.createGain();
    this._env(g, t, 0.14 * volume, 0.005, 0.25);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.3);
  }

  /** Power-up ran out: soft two-note descending "power down". */
  powerDown(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [660, 440].forEach((f, i) => {
      const st = t + i * 0.12;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, st);
      o.frequency.exponentialRampToValueAtTime(f * 0.8, st + 0.18);
      const g = ctx.createGain();
      this._env(g, st, 0.1 * volume, 0.01, 0.2);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.25);
    });
  }

  /** Shield Bubble absorbed a hit: glassy crack + low thump. */
  shieldBreak(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this._noiseSource(false);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;
    const ng = ctx.createGain();
    this._env(ng, t, 0.22 * volume, 0.003, 0.25);
    n.connect(hp).connect(ng).connect(this.master);
    n.start(t);
    n.stop(t + 0.3);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1800, t);
    o.frequency.exponentialRampToValueAtTime(400, t + 0.25);
    const g = ctx.createGain();
    this._env(g, t, 0.18 * volume, 0.005, 0.3);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.35);
  }

  /** Personal-best sting on the round-end screen. */
  personalBest(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [NOTE.C5, NOTE.G5, NOTE.D6, NOTE.D6 * 1.5].forEach((f, i) => {
      const st = t + i * 0.1;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      const g = ctx.createGain();
      this._env(g, st, 0.08 * volume, 0.01, 0.45);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.5);
    });
  }

  /**
   * Procedural Radar Warning Receiver (RWR) missile alert beeps.
   * - active: boolean
   * - critical: boolean (true if < 45m or time-to-impact < 0.6s)
   */
  updateMissileWarning(active, critical = false, volume = 1) {
    if (!this.ctx || this.muted || !active) return;
    const t = this.ctx.currentTime;
    const interval = critical ? 0.11 : 0.28;
    if (t - this.lastWarningBeepAt < interval) return;
    this.lastWarningBeepAt = t;
    const freq = critical ? 1380 : 940;
    const osc = this.ctx.createOscillator();
    osc.type = critical ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (critical) {
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.05);
    }
    const g = this.ctx.createGain();
    const peak = (critical ? 0.13 : 0.08) * volume;
    this._env(g, t, peak, 0.008, critical ? 0.06 : 0.11);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + (critical ? 0.08 : 0.13));
  }

  /**
   * Snappy high-tech lock-on chirp when acquiring a target via tap/click.
   */
  radarLock(volume = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08);
    this._env(g, t, 0.16 * volume, 0.005, 0.09);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);

    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, t + 0.05);
    osc2.frequency.setValueAtTime(2200, t + 0.11);
    this._env(g2, t + 0.05, 0.2 * volume, 0.005, 0.12);
    osc2.connect(g2).connect(this.master);
    osc2.start(t + 0.05);
    osc2.stop(t + 0.18);
  }

  /** Triumphant chime when an incoming missile is deflected by a barrel roll. */
  deflectChime(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [NOTE.G5, NOTE.D6].forEach((f, i) => {
      const st = t + i * 0.08;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      this._env(g, st, 0.14 * volume, 0.005, 0.25);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.3);
    });
  }

  /** Round-over jingle: descending then rising arpeggio. */
  roundOver(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [NOTE.G5, NOTE.E5, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.D6].forEach((f, i) => {
      const st = t + i * 0.14;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      this._env(g, st, 0.2 * volume, 0.01, 0.5);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.6);
    });
  }

  /** Mid-round event start jingle — a distinct motif per event type. */
  eventJingle(type, volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (type === 'balloonRush') {
      // Triumphant rising fanfare with a sparkle tail
      [NOTE.C5, NOTE.E5, NOTE.G5, 1046.5, 1318.5].forEach((f, i) => {
        const st = t + i * 0.09;
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        const g = ctx.createGain();
        this._env(g, st, 0.12 * volume, 0.01, 0.5);
        o.connect(g).connect(this.master);
        o.start(st);
        o.stop(st + 0.55);
        const shimmer = ctx.createOscillator();
        shimmer.type = 'sine';
        shimmer.frequency.value = f * 2;
        const sg = ctx.createGain();
        this._env(sg, st, 0.05 * volume, 0.01, 0.4);
        shimmer.connect(sg).connect(this.master);
        shimmer.start(st);
        shimmer.stop(st + 0.45);
      });
    } else if (type === 'meteorShower') {
      // Ominous: low rumble sweep + descending minor notes
      const rumble = this._noiseSource(false);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(600, t);
      lp.frequency.exponentialRampToValueAtTime(120, t + 1.1);
      const rg = ctx.createGain();
      this._env(rg, t, 0.3 * volume, 0.05, 1.0);
      rumble.connect(lp).connect(rg).connect(this.master);
      rumble.start(t);
      rumble.stop(t + 1.2);
      [440, 349.23, 293.66].forEach((f, i) => {
        const st = t + 0.15 + i * 0.22;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, st);
        o.frequency.exponentialRampToValueAtTime(f * 0.85, st + 0.3);
        const g = ctx.createGain();
        this._env(g, st, 0.12 * volume, 0.02, 0.4);
        o.connect(g).connect(this.master);
        o.start(st);
        o.stop(st + 0.45);
      });
    } else if (type === 'frenzy') {
      // Frantic fast up-down riff
      [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.E5, NOTE.C5, NOTE.G5, NOTE.B5, NOTE.D6].forEach((f, i) => {
        const st = t + i * 0.07;
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        const g = ctx.createGain();
        this._env(g, st, 0.11 * volume, 0.005, 0.18);
        o.connect(g).connect(this.master);
        o.start(st);
        o.stop(st + 0.22);
      });
    } else if (type === 'blimp') {
      // Ominous warhorn: deep sawtooth chord + brass filter swell
      [110, 164.81, 220].forEach((f, i) => {
        const st = t + i * 0.08;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(300, st);
        lp.frequency.exponentialRampToValueAtTime(800, st + 0.4);
        lp.frequency.exponentialRampToValueAtTime(200, st + 1.2);
        const g = ctx.createGain();
        this._env(g, st, 0.18 * volume, 0.06, 1.2);
        o.connect(lp).connect(g).connect(this.master);
        o.start(st);
        o.stop(st + 1.3);
      });
    } else if (type === 'balloonPop') {
      // Golden balloon burst: big pop + victory arpeggio
      this.fireworkPop(volume);
      [NOTE.C5, NOTE.G5, NOTE.D6, NOTE.D6 * 1.25].forEach((f, i) => {
        const st = t + 0.15 + i * 0.1;
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const g = ctx.createGain();
        this._env(g, st, 0.16 * volume, 0.01, 0.45);
        o.connect(g).connect(this.master);
        o.start(st);
        o.stop(st + 0.5);
      });
    }
  }

  bossRaidHorn(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [65.41, 98.00, 130.81].forEach((f, i) => {
      const st = t + i * 0.06;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(200, st);
      lp.frequency.exponentialRampToValueAtTime(750, st + 0.5);
      lp.frequency.exponentialRampToValueAtTime(140, st + 1.8);
      const g = ctx.createGain();
      this._env(g, st, 0.22 * volume, 0.08, 1.8);
      o.connect(lp).connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 1.9);
    });
  }

  bossPhaseChange(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (let k = 0; k < 3; k++) {
      const st = t + k * 0.28;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(440, st);
      o.frequency.linearRampToValueAtTime(880, st + 0.14);
      o.frequency.linearRampToValueAtTime(440, st + 0.26);
      const g = ctx.createGain();
      this._env(g, st, 0.18 * volume, 0.02, 0.26);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.27);
    }
  }

  bossHit(isCrit = false, volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = isCrit ? 'square' : 'triangle';
    o.frequency.setValueAtTime(isCrit ? 180 : 90, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.18);
    const g = ctx.createGain();
    this._env(g, t, (isCrit ? 0.24 : 0.16) * volume, 0.005, 0.18);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.2);
  }

  bossDefeat(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [261.63, 329.63, 392.00, 523.25, 659.25, 783.99].forEach((f, i) => {
      const st = t + i * 0.12;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      this._env(g, st, 0.2 * volume, 0.02, 0.7);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.8);
    });
  }

  bossTurretBurst(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const st = t + i * 0.065;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(520, st);
      o.frequency.exponentialRampToValueAtTime(75, st + 0.05);
      const g = ctx.createGain();
      this._env(g, st, 0.18 * volume, 0.002, 0.05);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.06);
    }
  }

  bossMissileSwarm(count = 2, volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (let i = 0; i < count; i++) {
      const st = t + i * 0.08;
      const noise = this._noiseSource(false);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(320, st);
      bp.frequency.exponentialRampToValueAtTime(1500, st + 0.25);
      bp.Q.value = 2.4;
      const g = ctx.createGain();
      this._env(g, st, 0.22 * volume, 0.02, 0.35);
      noise.connect(bp).connect(g).connect(this.master);
      noise.start(st);
      noise.stop(st + 0.4);
    }
  }

  bossRingWave(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(130, t);
    o.frequency.linearRampToValueAtTime(45, t + 0.6);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(800, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 0.75);
    const g = ctx.createGain();
    this._env(g, t, 0.35 * volume, 0.03, 0.75);
    o.connect(lp).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.8);
  }

  bossBulletHit(isRing = false, volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = isRing ? 'sine' : 'square';
    o.frequency.setValueAtTime(isRing ? 720 : 360, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
    const g = ctx.createGain();
    this._env(g, t, (isRing ? 0.25 : 0.2) * volume, 0.002, 0.12);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.14);
  }

  /** Close shave: a rocket-rock whoosh whipping past the canopy. */
  closeShave(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this._noiseSource(false);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2400, t);
    bp.frequency.exponentialRampToValueAtTime(300, t + 0.3);
    bp.Q.value = 1.8;
    const g = ctx.createGain();
    this._env(g, t, 0.22 * volume, 0.01, 0.3);
    n.connect(bp).connect(g).connect(this.master);
    n.start(t);
    n.stop(t + 0.35);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(980, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.2);
    const og = ctx.createGain();
    this._env(og, t, 0.1 * volume, 0.01, 0.22);
    o.connect(og).connect(this.master);
    o.start(t);
    o.stop(t + 0.25);
  }

  /** Style-scoring stings: whoosh for close calls, surf glide for low rider, crowd chant for gate weave. */
  styleStunt(kind, volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (kind === 'lowRider') {
      // Low gliding sine skimming the swell
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(160, t + 0.35);
      o.frequency.exponentialRampToValueAtTime(330, t + 0.6);
      const g = ctx.createGain();
      this._env(g, t, 0.18 * volume, 0.03, 0.6);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.65);
      return;
    }
    if (kind === 'gateWeave') {
      // Crowd chant: three punchy notes over a swelling noise bed
      [NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => {
        const st = t + i * 0.09;
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        const g = ctx.createGain();
        this._env(g, st, 0.12 * volume, 0.01, 0.2);
        o.connect(g).connect(this.master);
        o.start(st);
        o.stop(st + 0.25);
      });
      const crowd = this._noiseSource(false);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(900, t);
      bp.frequency.exponentialRampToValueAtTime(1800, t + 0.4);
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      this._env(g, t, 0.12 * volume, 0.05, 0.45);
      crowd.connect(bp).connect(g).connect(this.master);
      crowd.start(t);
      crowd.stop(t + 0.55);
      return;
    }
    // closeCall: razor whoosh whipping past the canopy
    const n = this._noiseSource(false);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(600, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + 0.22);
    bp.Q.value = 2.2;
    const g = ctx.createGain();
    this._env(g, t, 0.2 * volume, 0.01, 0.28);
    n.connect(bp).connect(g).connect(this.master);
    n.start(t);
    n.stop(t + 0.35);
  }

  /**
   * Pilot chatter: procedural voice synthesis for emotes.
   * Supports equipped voice style:
   * - voice_default: Animal-Crossing style 3-6 note comms chirp.
   * - voice_chiptune: Fast 4-note square-wave arcade arpeggio.
   * - voice_dreadnought: Deep detuned dual-sawtooth brass horn blast with low-pass swell.
   * - voice_sonar: High-frequency resonant sine ping with rapid FM pitch sweep.
   */
  pilotChatter(pilotIndex = 0, volume = 1, voiceStyle = 'voice_default') {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;

    if (voiceStyle === 'voice_chiptune') {
      // 8-Bit Arcade Arpeggio
      const base = 260 + ((pilotIndex * 53) % 240);
      const arp = [1.0, 1.2599, 1.4983, 2.0];
      for (let i = 0; i < 4; i++) {
        const st = t + i * 0.038;
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(base * arp[i], st);
        const g = ctx.createGain();
        this._env(g, st, 0.12 * volume, 0.003, 0.035);
        o.connect(g).connect(this.master);
        o.start(st);
        o.stop(st + 0.045);
      }
      return;
    }

    if (voiceStyle === 'voice_dreadnought') {
      // Deep detuned dual-sawtooth brass horn blast (65-95 Hz) with low-pass filter envelope
      const baseFreq = 68 + ((pilotIndex * 7) % 24);
      const duration = 0.85;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(280, t);
      lp.frequency.exponentialRampToValueAtTime(880, t + 0.15);
      lp.frequency.exponentialRampToValueAtTime(190, t + duration);
      lp.Q.value = 3.2;

      for (const detune of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(baseFreq, t);
        o.detune.setValueAtTime(detune, t);
        const g = ctx.createGain();
        this._env(g, t, 0.22 * volume, 0.06, duration - 0.06);
        o.connect(lp);
        o.start(t);
        o.stop(t + duration + 0.05);
      }
      lp.connect(this.master);
      return;
    }

    if (voiceStyle === 'voice_sonar') {
      // High-frequency resonant sine ping with rapid FM pitch sweep
      const startFreq = 2100 + ((pilotIndex * 120) % 600);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(startFreq, t);
      o.frequency.exponentialRampToValueAtTime(startFreq * 0.42, t + 0.18);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(startFreq * 0.7, t);
      bp.Q.value = 6.0;

      const g = ctx.createGain();
      this._env(g, t, 0.2 * volume, 0.005, 0.65);
      o.connect(bp).connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.7);
      return;
    }

    // Default: Animal-Crossing style procedural chirp
    const base = 240 + ((pilotIndex * 47) % 220); // 240-459 Hz, unique-ish per pilot
    const scale = [1, 1.125, 1.25, 1.335, 1.5, 1.685, 1.875]; // major-ish steps
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const st = t + i * 0.075;
      const f = base * scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.5 ? 1 : 2);
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(f, st);
      o.frequency.exponentialRampToValueAtTime(f * (0.9 + Math.random() * 0.2), st + 0.06);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.09 * volume, st + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.07);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.09);
    }
  }

  /** Shop purchase success sound: coin clink + ascending major chime. */
  playShopBuy(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const ping = ctx.createOscillator();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(1400, t);
    ping.frequency.exponentialRampToValueAtTime(1900, t + 0.04);
    const pg = ctx.createGain();
    this._env(pg, t, 0.25 * volume, 0.002, 0.22);
    ping.connect(pg).connect(this.master);
    ping.start(t);
    ping.stop(t + 0.25);

    [659.25, 830.61, 987.77, 1318.51].forEach((f, i) => {
      const st = t + 0.04 + i * 0.06;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      this._env(g, st, 0.14 * volume, 0.005, 0.35);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.4);
    });
  }

  /** Shop equip confirmation: dual mechanical ratchet click + power-on affirmation. */
  playShopEquip(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const delay of [0, 0.035]) {
      const st = t + delay;
      const click = ctx.createOscillator();
      click.type = 'triangle';
      click.frequency.setValueAtTime(800, st);
      click.frequency.exponentialRampToValueAtTime(200, st + 0.015);
      const cg = ctx.createGain();
      this._env(cg, st, 0.22 * volume, 0.002, 0.02);
      click.connect(cg).connect(this.master);
      click.start(st);
      click.stop(st + 0.03);
    }
    [349.23, 523.25].forEach((f, i) => {
      const st = t + 0.05 + i * 0.05;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      this._env(g, st, 0.16 * volume, 0.01, 0.28);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 0.35);
    });
  }

  /** Credit roll-up counter tick for post-match scoreboard. */
  playCreditTick(volume = 1) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1600, t);
    o.frequency.exponentialRampToValueAtTime(1100, t + 0.018);
    const g = ctx.createGain();
    this._env(g, t, 0.08 * volume, 0.001, 0.018);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.025);
  }
}
