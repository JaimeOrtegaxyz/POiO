/**
 * Placeholder sounds, synthesized with WebAudio. The final sound design is
 * Jaime's; these only need to be distinct, short (< 1 s) and learnable.
 * The set (VOICE.md): chirp on turn-on, press/release ticks, checkpoint
 * cluck, didn't-understand, finish cluck. Nothing else makes sound.
 */

export type SoundName = 'chirp' | 'press' | 'release' | 'checkpoint' | 'notUnderstood' | 'finish';

export class Sounds {
  private ctx: AudioContext | null = null;
  muted = false;
  /** Last few sounds played, for the debug panel and tests. */
  readonly log: { name: SoundName; at: number }[] = [];

  /** Call from a user gesture (the Encender click) so the browser allows audio. */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    void this.ctx?.resume();
  }

  play(name: SoundName): void {
    this.log.push({ name, at: Date.now() });
    if (this.log.length > 20) this.log.shift();
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case 'chirp':
        this.tone('sine', 1250, 1750, t, 0.08, 0.22);
        this.tone('sine', 1500, 2100, t + 0.1, 0.09, 0.2);
        break;
      case 'press':
        this.tone('square', 2100, 1900, t, 0.025, 0.08);
        break;
      case 'release':
        this.tone('square', 1300, 1150, t, 0.03, 0.08);
        break;
      case 'checkpoint':
        this.cluck(t, 560, 0.11);
        this.cluck(t + 0.16, 560, 0.11);
        break;
      case 'notUnderstood':
        this.tone('triangle', 620, 600, t, 0.14, 0.18);
        this.tone('triangle', 440, 420, t + 0.17, 0.2, 0.18);
        break;
      case 'finish':
        this.cluck(t, 500, 0.1);
        this.cluck(t + 0.14, 500, 0.1);
        this.cluck(t + 0.3, 760, 0.26);
        break;
    }
  }

  private tone(type: OscillatorType, f0: number, f1: number, t: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** A hen-ish "bok": a triangle with a fast pitch drop and a little filtered noise. */
  private cluck(t: number, f: number, dur: number): void {
    const ctx = this.ctx!;
    this.tone('triangle', f, f * 0.55, t, dur, 0.3);
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 2;
    bp.Q.value = 3;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
  }
}
