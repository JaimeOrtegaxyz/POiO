/**
 * The red star knob: one part, three gestures.
 *
 *   rotate  mouse wheel, or drag around the knob (arrow keys: input/keys.ts)
 *   press   a short click or tap (Enter)
 *   hold    keep it down past HOLD_MS without turning: push-to-talk,
 *           released = send (Space does the same)
 *
 * The star turns one detent per step. Its short turn is the only CSS
 * transition on the page: device chrome reacting to a hand, never the
 * screen, never a loop.
 */

export interface KnobHandlers {
  onRotate(dir: 1 | -1): void;
  onPress(): void;
  /** The hold passed HOLD_MS; `since` is when the pointer went down. */
  onHoldStart(since: number): void;
  onHoldEnd(): void;
}

/** How long a press must last to count as a hold (talk) instead of a press. */
export const HOLD_MS = 300;
export const DETENT_DEG = 24;
const WHEEL_STEP = 60; // accumulated wheel delta per detent (trackpads send many small deltas)
const DRAG_DEG = 24; // degrees of finger travel around the knob per detent
const SLOP_PX = 6; // movement under this is still a press or a hold

export class Knob {
  private angle = 0;
  private wheelAccum = 0;
  private lastWheel = 0;

  constructor(
    private knob: HTMLElement,
    private turnEl: HTMLElement,
    private h: KnobHandlers,
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

    // Pointer: press, hold or drag-to-turn, decided by time and movement.
    let down = false, holding = false, dragging = false;
    let downAt = 0, startX = 0, startY = 0, lastAngle: number | null = null, accum = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => { if (timer) clearTimeout(timer); timer = null; };
    const angleAt = (e: PointerEvent): number | null => {
      const r = knob.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      // Too near the center the angle jumps around: ignore those samples.
      return Math.hypot(dx, dy) < r.width * 0.12 ? null : (Math.atan2(dy, dx) * 180) / Math.PI;
    };

    knob.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      try { knob.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      down = true; holding = false; dragging = false;
      downAt = performance.now(); startX = e.clientX; startY = e.clientY;
      lastAngle = angleAt(e); accum = 0;
      clear();
      timer = setTimeout(() => {
        timer = null;
        if (!down || dragging) return;
        holding = true;
        this.h.onHoldStart(downAt);
      }, HOLD_MS);
    });
    knob.addEventListener('pointermove', (e) => {
      if (!down || holding) return;
      if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) >= SLOP_PX) { dragging = true; clear(); }
      if (!dragging) return;
      const a = angleAt(e);
      if (a === null) return;
      if (lastAngle === null) { lastAngle = a; return; }
      let d = a - lastAngle;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      lastAngle = a;
      accum += d;
      while (Math.abs(accum) >= DRAG_DEG) {
        const dir = accum > 0 ? 1 : -1;
        accum -= dir * DRAG_DEG;
        this.turn(dir);
      }
    });
    const end = (e: PointerEvent, cancelled: boolean) => {
      if (!down) return;
      down = false;
      clear();
      try { knob.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      if (holding) { holding = false; this.h.onHoldEnd(); return; }
      if (!dragging && !cancelled) this.press();
    };
    knob.addEventListener('pointerup', (e) => end(e, false));
    knob.addEventListener('pointercancel', (e) => end(e, true));
    // A long touch must not open the context menu or select anything.
    knob.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  turn(dir: 1 | -1): void {
    this.angle += dir * DETENT_DEG;
    this.turnEl.style.transform = `rotate(${this.angle}deg)`;
    this.h.onRotate(dir);
  }

  press(): void {
    this.knob.classList.add('pressed');
    setTimeout(() => this.knob.classList.remove('pressed'), 120);
    this.h.onPress();
  }
}
