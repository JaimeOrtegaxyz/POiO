/**
 * The emulated screen: draw at native resolution offscreen, run the panel
 * pass, then present through the refresh emulation onto the visible canvas
 * (integer scale, pixelated). Nothing on the screen itself is DOM.
 */
import { panelPass } from './panel';
import { Painter, FAMILY } from './painter';
import { PROFILES, type Profile, type ProfileId, type TimingMode } from './profiles';
import { Display, type RefreshKind } from './refresh';

export class Screen {
  private off = document.createElement('canvas');
  private offCtx = this.off.getContext('2d', { willReadFrequently: true })!;
  readonly display: Display;
  profile: Profile;
  timing: TimingMode;
  scale: number;

  constructor(readonly canvas: HTMLCanvasElement, profileId: ProfileId, timing: TimingMode, scale?: number) {
    this.profile = PROFILES[profileId];
    this.timing = timing;
    this.scale = scale ?? this.profile.defaultScale;
    this.display = new Display(canvas, () => this.profile, () => this.timing);
    this.display.configure(this.scale);
  }

  setProfile(id: ProfileId, scale?: number): void {
    this.profile = PROFILES[id];
    this.scale = scale ?? this.profile.defaultScale;
    this.display.configure(this.scale);
  }

  setScale(n: number): void { this.scale = n; this.display.configure(n); }
  setTiming(m: TimingMode): void { this.timing = m; }

  blank(): void {
    const p = this.profile;
    this.display.blank(p.mode === 'kaleido' ? p.kaleido!.paper : p.colors.paper);
  }

  /** Draw a frame and present it with a full refresh or a partial repaint. */
  render(draw: (p: Painter) => void, kind: RefreshKind): void {
    const p = this.profile;
    if (this.off.width !== p.width || this.off.height !== p.height) {
      this.off.width = p.width;
      this.off.height = p.height;
    }
    const painter = new Painter(this.offCtx, p);
    painter.clear('paper');
    draw(painter);
    const frame = this.offCtx.getImageData(0, 0, p.width, p.height);
    panelPass(frame, p);
    this.display.present(frame, kind);
  }
}

/** Load every face the screen uses, then wait for document.fonts.ready before the first paint. */
export async function loadFonts(): Promise<void> {
  const faces = [
    `500 20px ${FAMILY.q}`, `600 20px ${FAMILY.q}`, `700 20px ${FAMILY.q}`,
    `400 13px ${FAMILY.m}`, `500 13px ${FAMILY.m}`, `700 13px ${FAMILY.m}`,
  ];
  await Promise.all(faces.map((f) => document.fonts.load(f, 'POiO áéíóúñ ¿?·…½').catch(() => [])));
  await document.fonts.ready;
}
