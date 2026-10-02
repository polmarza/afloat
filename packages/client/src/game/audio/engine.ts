// Sound output: one AudioContext, a master volume (with mute) and a
// compressor so piled-up sounds never clip. Every sound is synthesized here
// from oscillators and filtered noise: no audio files.
//
// Browsers only let audio start after the player clicked or pressed a key, so
// the context is created (or resumed) by `unlock()`, called from those events.

const PREFS_KEY = 'afloat.sound';
const DEFAULT_VOLUME = 0.7;
/** Headroom: the master gain at full volume. */
const MASTER_MAX = 0.8;

export interface ToneOptions {
  freq: number;
  /** Glide to this frequency over the sound. */
  to?: number;
  type?: OscillatorType;
  /** Seconds from now. */
  at?: number;
  attack?: number;
  /** Total length in seconds. */
  dur: number;
  gain: number;
  filter?: FilterOptions;
}

export interface NoiseOptions {
  at?: number;
  attack?: number;
  dur: number;
  gain: number;
  filter: FilterOptions;
}

export interface FilterOptions {
  type: BiquadFilterType;
  freq: number;
  /** Sweep the cutoff to this frequency over the sound. */
  to?: number;
  q?: number;
}

export class Sound {
  volume = DEFAULT_VOLUME;
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly lastPlayed = new Map<string, number>();

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as { volume?: number; muted?: boolean } | null;
      if (typeof saved?.volume === 'number') this.volume = Math.min(1, Math.max(0, saved.volume));
      if (typeof saved?.muted === 'boolean') this.muted = saved.muted;
    } catch {
      // Defaults: on, at 70 %.
    }
  }

  /** Creates or wakes the audio context. Call it from a click or key press. */
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.ratio.value = 6;
      this.master = this.ctx.createGain();
      this.master.connect(compressor).connect(this.ctx.destination);
      this.applyVolume();
      // Two seconds of white noise, reused by every noisy sound.
      const length = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** The context, once unlocked and running (null: stay silent). */
  get context() {
    return this.ctx && this.ctx.state !== 'closed' ? this.ctx : null;
  }

  /** Where every sound connects. */
  get output(): AudioNode | null {
    return this.master;
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.volume > 0) this.muted = false;
    this.applyVolume();
    this.save();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.applyVolume();
    this.save();
  }

  /** False if `name` already sounded less than `ms` ago (so repeats don't pile up). */
  throttle(name: string, ms: number) {
    const now = performance.now();
    if (now - (this.lastPlayed.get(name) ?? -Infinity) < ms) return false;
    this.lastPlayed.set(name, now);
    return true;
  }

  // ------------------------------------------------------------ building blocks

  tone(o: ToneOptions) {
    const c = this.context;
    if (!c || !this.master) return;
    const t0 = c.currentTime + (o.at ?? 0);
    const osc = c.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    const out = this.envelope(c, t0, o.attack ?? 0.005, o.dur, o.gain);
    osc.connect(o.filter ? this.filter(c, t0, o.dur, o.filter, out) : out);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  noise(o: NoiseOptions) {
    const c = this.context;
    if (!c || !this.master || !this.noiseBuffer) return;
    const t0 = c.currentTime + (o.at ?? 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const out = this.envelope(c, t0, o.attack ?? 0.005, o.dur, o.gain);
    src.connect(this.filter(c, t0, o.dur, o.filter, out));
    // Start somewhere random in the buffer so repeated noises don't sound identical.
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + o.dur + 0.05);
  }

  /** A looping noise source (for the ambience); the caller stops it. */
  noiseSource() {
    const c = this.context;
    if (!c || !this.noiseBuffer) return null;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    return src;
  }

  private envelope(c: AudioContext, t0: number, attack: number, dur: number, gain: number) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + Math.min(attack, dur * 0.9));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(this.master!);
    return g;
  }

  private filter(c: AudioContext, t0: number, dur: number, f: FilterOptions, out: AudioNode) {
    const node = c.createBiquadFilter();
    node.type = f.type;
    node.frequency.setValueAtTime(f.freq, t0);
    if (f.to) node.frequency.exponentialRampToValueAtTime(f.to, t0 + dur);
    if (f.q !== undefined) node.Q.value = f.q;
    node.connect(out);
    return node;
  }

  private applyVolume() {
    if (!this.master || !this.ctx) return;
    const target = this.muted ? 0 : this.volume * MASTER_MAX;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  private save() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ volume: this.volume, muted: this.muted }));
    } catch {
      // Not remembered this time.
    }
  }
}
