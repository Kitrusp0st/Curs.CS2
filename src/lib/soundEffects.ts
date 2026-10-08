// Web Audio API Tactical Sound Engine for CURS CS2 Clan Portal
// Synthesizes crisp, zero-latency tactical UI sound effects without external audio files.

class TacticalSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.35;
  private lastHoverTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedEnabled = window.localStorage.getItem('curs_sound_enabled');
      const savedVol = window.localStorage.getItem('curs_sound_volume');
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed)) this.volume = Math.max(0.05, Math.min(1, parsed));
      }
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('curs_sound_enabled', String(val));
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0.05, Math.min(1, val));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('curs_sound_volume', String(this.volume));
    }
  }

  // Subtle high-tech tick when hovering interactive buttons or tabs
  public playHover(): void {
    const nowMs = performance.now();
    if (nowMs - this.lastHoverTime < 45) return; // debounce rapid hovers
    this.lastHoverTime = nowMs;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(1150, t);
      osc.frequency.exponentialRampToValueAtTime(1650, t + 0.028);

      gain.gain.setValueAtTime(0.08 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.028);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.03);
    } catch {
      // Ignore audio context restrictions
    }
  }

  // Crisp mechanical tactical click when pressing a button
  public playClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.055);

      gain.gain.setValueAtTime(0.28 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch {
      // Ignore
    }
  }

  // Smooth tactical frequency sweep when switching navigation tabs
  public playTabSwitch(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, t);
      osc.frequency.exponentialRampToValueAtTime(760, t + 0.075);

      gain.gain.setValueAtTime(0.2 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.085);
    } catch {
      // Ignore
    }
  }

  // Harmonic confirmation chime when saving settings, adding a player, or submitting an application
  public playSuccess(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = t + idx * 0.055;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, start);

        gain.gain.setValueAtTime(0.22 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.19);
      });
    } catch {
      // Ignore
    }
  }

  // Low alert tone for errors or deletions
  public playAlert(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      [240, 185].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = t + idx * 0.085;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, start);

        gain.gain.setValueAtTime(0.18 * this.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.13);
      });
    } catch {
      // Ignore
    }
  }
}

export const soundEngine = new TacticalSoundEngine();
