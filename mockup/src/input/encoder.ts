/**
 * The encoder: rotate in detents, press to select. Mouse wheel or arrow keys
 * rotate; Enter or a click on the knob presses; dragging the knob up/down
 * also rotates (pattern from archive/stage2/web/app.js). The dial turns one
 * detent per step, instantly: device chrome, but still no motion loops.
 */

export interface EncoderHandlers {
  onRotate(dir: 1 | -1): void;
  onPress(): void;
}

const DETENT_DEG = 24;
const WHEEL_STEP = 60; // accumulated wheel delta per detent (trackpads send many small deltas)
const DRAG_STEP = 16; // px of vertical drag per detent

export class Encoder {
  private angle = 0;
  private wheelAccum = 0;
  private lastWheel = 0;

  constructor(
    private knob: HTMLElement,
    private dial: HTMLElement,
    private h: EncoderHandlers,
    private isTyping: () => boolean,
    wheelTargets: HTMLElement[],
  ) {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now - this.lastWheel > 250) this.wheelAccum = 0;
      this.lastWheel = now;
      // A classic mouse wheel sends one large delta per notch: always one detent.
      if (Math.abs(e.deltaY) >= WHEEL_STEP && e.deltaMode === 0 && Math.abs(this.wheelAccum) < 1) {
        this.turn(e.deltaY > 0 ? 1 : -1);
        return;
      }
      this.wheelAccum += e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      while (Math.abs(this.wheelAccum) >= WHEEL_STEP) {
        const d = this.wheelAccum > 0 ? 1 : -1;
        this.wheelAccum -= d * WHEEL_STEP;
        this.turn(d);
      }
    };
    for (const t of [knob, ...wheelTargets]) t.addEventListener('wheel', onWheel, { passive: false });

    let dragging = false, lastY = 0, moved = 0, accum = 0;
    knob.addEventListener('pointerdown', (e) => {
      dragging = true; lastY = e.clientY; moved = 0; accum = 0;
      try { knob.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      e.preventDefault();
    });
    knob.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = e.clientY - lastY;
      lastY = e.clientY;
      moved += Math.abs(dy);
      accum += dy;
      while (Math.abs(accum) >= DRAG_STEP) {
        const d = accum > 0 ? 1 : -1;
        accum -= d * DRAG_STEP;
        this.turn(d);
      }
    });
    const end = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try { knob.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      if (moved < 5) this.press();
    };
    knob.addEventListener('pointerup', end);
    knob.addEventListener('pointercancel', end);

    window.addEventListener('keydown', (e) => {
      if (this.isTyping()) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); this.turn(1); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); this.turn(-1); }
      else if (e.key === 'Enter' && !e.repeat) {
        // Let a focused button (Encender, debug controls) take its own Enter.
        if (document.activeElement instanceof HTMLButtonElement) return;
        e.preventDefault();
        this.press();
      }
    });
  }

  turn(dir: 1 | -1): void {
    this.angle += dir * DETENT_DEG;
    this.dial.style.transform = `rotate(${this.angle}deg)`;
    this.h.onRotate(dir);
  }

  press(): void {
    this.knob.classList.add('pressed');
    setTimeout(() => this.knob.classList.remove('pressed'), 120);
    this.h.onPress();
  }
}
