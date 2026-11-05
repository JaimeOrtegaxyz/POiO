/**
 * The keyboard map for the device's three controls. Pure, so the tests can
 * pin it down:
 *
 *   star knob   ←/→ or ↑/↓ rotate · Enter press · hold Space to talk
 *   left pill   Esc or Backspace: back
 *   right pill  H: home (the cookbook)
 *
 * Keys are ignored while the typed field has focus, and with Ctrl/Cmd/Alt
 * held so browser shortcuts keep working.
 */

export type KeyAction =
  | { kind: 'rotate'; dir: 1 | -1 }
  | { kind: 'press' }
  | { kind: 'talk' }
  | { kind: 'back' }
  | { kind: 'home' };

export interface KeyLike {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export function keyAction(e: KeyLike): KeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.code === 'Space' || e.key === ' ') return { kind: 'talk' };
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return { kind: 'rotate', dir: 1 };
    case 'ArrowLeft':
    case 'ArrowUp':
      return { kind: 'rotate', dir: -1 };
    case 'Enter':
      return { kind: 'press' };
    case 'Escape':
    case 'Backspace':
      return { kind: 'back' };
    case 'h':
    case 'H':
      return { kind: 'home' };
    default:
      return null;
  }
}

export interface KeyHandlers {
  rotate(dir: 1 | -1): void;
  press(): void;
  talkStart(): void;
  talkEnd(): void;
  back(): void;
  home(): void;
}

/** One window listener for the whole map. */
export function bindKeys(h: KeyHandlers, isTyping: () => boolean): void {
  window.addEventListener('keydown', (e) => {
    if (isTyping()) return;
    const a = keyAction(e);
    if (!a) return;
    // Let a focused button (Encender, debug controls) take its own Enter.
    if (a.kind === 'press' && document.activeElement instanceof HTMLButtonElement) return;
    e.preventDefault();
    if (a.kind === 'rotate') { h.rotate(a.dir); return; }
    if (e.repeat) return;
    if (a.kind === 'press') h.press();
    else if (a.kind === 'talk') h.talkStart();
    else if (a.kind === 'back') h.back();
    else h.home();
  });
  window.addEventListener('keyup', (e) => {
    if (isTyping()) return;
    if (keyAction(e)?.kind !== 'talk') return;
    e.preventDefault();
    h.talkEnd();
  });
}
