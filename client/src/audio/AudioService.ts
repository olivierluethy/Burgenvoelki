import { useUIStore } from '@/state/uiStore';

export type Sfx =
  | 'throw'
  | 'bounceWood'
  | 'bounceWall'
  | 'hitPlayer'
  | 'out'
  | 'respawn'
  | 'pickup'
  | 'ui'
  | 'keulePickup'
  | 'keuleInvalid'
  | 'capture'
  | 'victory'
  | 'roundStart';

/**
 * Centralized audio. All SFX are synthesized procedurally with the Web Audio
 * API (no licensed assets), so the project stays self-contained and offline.
 * Structured so real audio files can be dropped in later without touching call
 * sites: callers only ever say `audio.play('hitPlayer')`.
 */
class AudioService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  /** Lazily create/resume the context (must follow a user gesture). */
  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoise(this.ctx);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Call on a user gesture (entering a match) to unlock audio. */
  unlock() {
    this.ensure();
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const len = ctx.sampleRate * 0.6;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private gainNow(): number {
    const s = useUIStore.getState().settings;
    return s.masterVolume * s.sfxVolume;
  }

  private tone(
    ctx: AudioContext,
    opts: {
      type?: OscillatorType;
      freq: number;
      to?: number;
      dur: number;
      gain: number;
      delay?: number;
      attack?: number;
    },
  ) {
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
    const peak = opts.gain * this.gainNow();
    const atk = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
  }

  private noise(
    ctx: AudioContext,
    opts: { dur: number; gain: number; freq?: number; q?: number; type?: BiquadFilterType; delay?: number },
  ) {
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.type ?? 'bandpass';
    filter.frequency.value = opts.freq ?? 1200;
    filter.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    const peak = opts.gain * this.gainNow();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master!);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.02);
  }

  play(sfx: Sfx, intensity = 1) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const k = Math.max(0.15, Math.min(1.4, intensity));

    switch (sfx) {
      case 'throw':
        this.noise(ctx, { dur: 0.16, gain: 0.25 * k, freq: 900, q: 0.7, type: 'highpass' });
        this.tone(ctx, { type: 'triangle', freq: 320, to: 620, dur: 0.16, gain: 0.12 });
        break;
      case 'bounceWood':
        this.tone(ctx, { type: 'sine', freq: 150, to: 90, dur: 0.14, gain: 0.28 * k });
        this.noise(ctx, { dur: 0.05, gain: 0.12 * k, freq: 500, q: 0.6, type: 'lowpass' });
        break;
      case 'bounceWall':
        this.tone(ctx, { type: 'sine', freq: 240, to: 160, dur: 0.1, gain: 0.2 * k });
        this.noise(ctx, { dur: 0.04, gain: 0.1 * k, freq: 1800, q: 0.8 });
        break;
      case 'hitPlayer':
        this.tone(ctx, { type: 'square', freq: 220, to: 90, dur: 0.18, gain: 0.24 });
        this.noise(ctx, { dur: 0.12, gain: 0.28, freq: 700, q: 0.5, type: 'lowpass' });
        break;
      case 'out':
        this.tone(ctx, { type: 'sawtooth', freq: 300, to: 90, dur: 0.4, gain: 0.2 });
        break;
      case 'respawn':
        this.tone(ctx, { type: 'sine', freq: 300, to: 500, dur: 0.14, gain: 0.16 });
        this.tone(ctx, { type: 'sine', freq: 500, to: 760, dur: 0.16, gain: 0.16, delay: 0.12 });
        break;
      case 'pickup':
        this.tone(ctx, { type: 'triangle', freq: 520, to: 720, dur: 0.09, gain: 0.16 });
        break;
      case 'ui':
        this.tone(ctx, { type: 'square', freq: 420, dur: 0.05, gain: 0.08 });
        break;
      case 'keulePickup':
        this.tone(ctx, { type: 'triangle', freq: 400, to: 300, dur: 0.16, gain: 0.2 });
        this.tone(ctx, { type: 'sine', freq: 200, to: 150, dur: 0.22, gain: 0.16, delay: 0.02 });
        break;
      case 'keuleInvalid':
        this.tone(ctx, { type: 'square', freq: 160, dur: 0.12, gain: 0.2 });
        this.tone(ctx, { type: 'square', freq: 150, dur: 0.12, gain: 0.2, delay: 0.14 });
        break;
      case 'roundStart':
        this.tone(ctx, { type: 'triangle', freq: 440, dur: 0.12, gain: 0.18 });
        this.tone(ctx, { type: 'triangle', freq: 660, dur: 0.16, gain: 0.18, delay: 0.12 });
        break;
      case 'capture':
        [523, 659, 784].forEach((f, i) =>
          this.tone(ctx, { type: 'triangle', freq: f, dur: 0.18, gain: 0.18, delay: i * 0.08 }),
        );
        break;
      case 'victory':
        [523, 659, 784, 1047].forEach((f, i) =>
          this.tone(ctx, { type: 'triangle', freq: f, dur: 0.28, gain: 0.2, delay: i * 0.12 }),
        );
        break;
    }
  }
}

export const audio = new AudioService();
