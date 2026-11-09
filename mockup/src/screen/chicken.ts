/**
 * The chicken, drawn as vectors straight from the brand SVGs in assets/
 * (chicken-color: red hen on a yellow disc; chicken-alone: the ink
 * silhouette). The paths become Path2D at first use, filled with the panel's
 * own chrome colors, so they stay crisp at any scale and true to the
 * palette. Static: drawn once per repaint, never animated.
 */
import alone from '../../../assets/chicken-alone.svg?raw';
import color from '../../../assets/chicken-color.svg?raw';
import type { ChromeColor } from './profiles';

export type ChickenKind = 'color' | 'alone';

interface Shape { d?: string; circle?: [number, number, number]; fill: string; evenOdd: boolean }
interface Parsed { w: number; h: number; shapes: Shape[] }

/** Read the viewBox and every <path>/<circle> with its fill. Exported for tests. */
export function parseSvg(svg: string): Parsed {
  const vb = /viewBox="([\d.\s-]+)"/.exec(svg)?.[1].trim().split(/\s+/).map(Number) ?? [0, 0, 100, 100];
  const shapes: Shape[] = [];
  for (const m of svg.matchAll(/<(path|circle)\b([^>]*)\/?>/g)) {
    const attrs = m[2];
    const get = (k: string) => new RegExp(`\\b${k}="([^"]*)"`).exec(attrs)?.[1];
    const fill = get('fill') ?? 'black';
    if (fill === 'none') continue;
    const evenOdd = get('fill-rule') === 'evenodd';
    if (m[1] === 'circle') shapes.push({ circle: [Number(get('cx')), Number(get('cy')), Number(get('r'))], fill, evenOdd });
    else shapes.push({ d: get('d'), fill, evenOdd });
  }
  return { w: vb[2], h: vb[3], shapes };
}

const SOURCES: Record<ChickenKind, string> = { color, alone };

/** The SVG's own colors, mapped to the panel's chrome colors. */
const FILLS: Record<string, ChromeColor> = { '#FFC700': 'yellow', '#E50001': 'red', black: 'ink', '#000': 'ink', '#000000': 'ink' };

export function chickenFill(svgFill: string): ChromeColor {
  return FILLS[svgFill] ?? FILLS[svgFill.toUpperCase()] ?? 'ink';
}

const cache = new Map<ChickenKind, { w: number; h: number; paths: { path: Path2D; fill: ChromeColor; rule: CanvasFillRule }[] }>();

export function chicken(kind: ChickenKind) {
  let c = cache.get(kind);
  if (!c) {
    const p = parseSvg(SOURCES[kind]);
    c = {
      w: p.w,
      h: p.h,
      paths: p.shapes.map((s) => {
        const path = new Path2D(s.d);
        if (s.circle) path.arc(s.circle[0], s.circle[1], s.circle[2], 0, Math.PI * 2);
        return { path, fill: chickenFill(s.fill), rule: (s.evenOdd ? 'evenodd' : 'nonzero') as CanvasFillRule };
      }),
    };
    cache.set(kind, c);
  }
  return c;
}

const aspects = new Map<ChickenKind, number>();

/** Aspect (width / height) of a chicken drawing. */
export function chickenAspect(kind: ChickenKind): number {
  let a = aspects.get(kind);
  if (a === undefined) {
    const p = parseSvg(SOURCES[kind]);
    a = p.w / p.h;
    aspects.set(kind, a);
  }
  return a;
}
