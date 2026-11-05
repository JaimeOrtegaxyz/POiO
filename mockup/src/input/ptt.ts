/**
 * Push-to-talk on the red button. Hold with the pointer (pointer capture) or
 * Space (when the text field isn't focused). Press -> LED on, press tick,
 * speech recognition in es-MX with interim results. Release -> release
 * tick, use the final transcript. We own the hold: if the recognizer ends
 * early while the button is still held, it restarts and keeps what it heard.
 */

export interface PttResult {
  text: string;
  heldMs: number;
  /** false when the browser has no SpeechRecognition. */
  supported: boolean;
}

export interface PttHandlers {
  canListen(): boolean;
  onStart(): void;
  onEnd(r: PttResult): void;
  /** Called once, the first time someone presses without speech support. */
  onUnsupported(): void;
}

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/** Below this, a press counts as "didn't understand". */
export const MIN_HOLD_MS = 300;

export class PushToTalk {
  private holding = false;
  private startedAt = 0;
  private rec: Recognition | null = null;
  private committed = '';
  private finals = '';
  private interim = '';
  private warned = false;
  private ended: (() => void) | null = null;
  private blocked = false;

  constructor(private button: HTMLElement, private led: HTMLElement, private h: PttHandlers, private isTyping: () => boolean) {
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { button.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      this.down();
    });
    const up = (e: PointerEvent) => {
      try { button.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      this.up();
    };
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || this.isTyping()) return;
      e.preventDefault();
      if (!e.repeat) this.down();
    });
    window.addEventListener('keyup', (e) => {
      if (e.code !== 'Space' || this.isTyping()) return;
      e.preventDefault();
      this.up();
    });
    window.addEventListener('blur', () => this.up());
  }

  get isHolding(): boolean { return this.holding; }

  private down(): void {
    if (this.holding) return;
    if (!this.h.canListen()) { this.blocked = true; return; }
    this.blocked = false;
    this.holding = true;
    this.startedAt = performance.now();
    this.committed = ''; this.finals = ''; this.interim = '';
    this.led.classList.add('on');
    this.button.classList.add('held');
    this.h.onStart();
    if (!speechSupported()) {
      if (!this.warned) { this.warned = true; this.h.onUnsupported(); }
      return;
    }
    this.listen();
  }

  private listen(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec: Recognition = new SR();
    rec.lang = 'es-MX';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      let fin = '', mid = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else mid += r[0].transcript;
      }
      this.finals = fin;
      this.interim = mid;
    };
    rec.onerror = (e: any) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        if (!this.warned) { this.warned = true; this.h.onUnsupported(); }
      }
    };
    rec.onend = () => {
      // Keep what this recognizer heard, then restart if the button is still held.
      this.committed = `${this.committed} ${this.finals}`.trim();
      this.finals = '';
      if (this.holding && this.rec === rec) {
        try { rec.start(); return; } catch { /* fall through */ }
      }
      if (this.rec === rec) this.rec = null;
      this.ended?.();
    };
    this.rec = rec;
    try { rec.start(); } catch { /* already started */ }
  }

  private up(): void {
    if (this.blocked) { this.blocked = false; return; }
    if (!this.holding) return;
    this.holding = false;
    const heldMs = performance.now() - this.startedAt;
    this.led.classList.remove('on');
    this.button.classList.remove('held');
    const supported = speechSupported();
    const finish = () => {
      this.ended = null;
      const text = `${this.committed} ${this.finals || this.interim}`.replace(/\s+/g, ' ').trim();
      this.h.onEnd({ text, heldMs, supported });
    };
    const rec = this.rec;
    if (!rec) { finish(); return; }
    // Wait for the final result (onend), but never more than 1.2 s.
    const timer = setTimeout(() => { this.ended = null; this.rec = null; try { rec.abort(); } catch { /* ignore */ } finish(); }, 1200);
    this.ended = () => { clearTimeout(timer); finish(); };
    try { rec.stop(); } catch { clearTimeout(timer); finish(); }
  }
}
