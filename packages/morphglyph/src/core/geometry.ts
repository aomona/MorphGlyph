import type { PathCommand } from 'opentype.js';
import { mixPoint, type Bounds, type Contour, type Cubic, type Glyph, type Point } from './types';

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const line = (a: Point, b: Point): Cubic => [a, mixPoint(a, b, 1 / 3), mixPoint(a, b, 2 / 3), b];

export function contoursFromCommands(commands: PathCommand[]): Contour[] {
  const result: Contour[] = [];
  let contour: Contour = [];
  let current = { x: 0, y: 0 };
  let start = current;
  const close = () => {
    if (contour.length) {
      if (distance(current, start) > 1e-8) contour.push(line(current, start));
      result.push(contour);
    }
    contour = [];
    current = start;
  };
  for (const command of commands) {
    if (command.type === 'M') {
      close();
      start = current = { x: command.x, y: command.y };
    } else if (command.type === 'Z') {
      close();
    } else {
      const end = { x: command.x, y: command.y };
      if (command.type === 'L') contour.push(line(current, end));
      if (command.type === 'Q') {
        const control = { x: command.x1, y: command.y1 };
        contour.push([
          current,
          mixPoint(current, control, 2 / 3),
          mixPoint(end, control, 2 / 3),
          end,
        ]);
      }
      if (command.type === 'C')
        contour.push([
          current,
          { x: command.x1, y: command.y1 },
          { x: command.x2, y: command.y2 },
          end,
        ]);
      current = end;
    }
  }
  close();
  return result;
}

export function split(segment: Cubic, t = 0.5): [Cubic, Cubic] {
  const [a, b, c, d] = segment;
  const ab = mixPoint(a, b, t),
    bc = mixPoint(b, c, t),
    cd = mixPoint(c, d, t);
  const abc = mixPoint(ab, bc, t),
    bcd = mixPoint(bc, cd, t);
  const center = mixPoint(abc, bcd, t);
  return [
    [a, ab, abc, center],
    [center, bcd, cd, d],
  ];
}

export function pointOn(segment: Cubic, t: number): Point {
  const u = 1 - t;
  return {
    x:
      u ** 3 * segment[0].x +
      3 * u * u * t * segment[1].x +
      3 * u * t * t * segment[2].x +
      t ** 3 * segment[3].x,
    y:
      u ** 3 * segment[0].y +
      3 * u * u * t * segment[1].y +
      3 * u * t * t * segment[2].y +
      t ** 3 * segment[3].y,
  };
}

export const sample = (contour: Contour) =>
  contour.flatMap((s) => [0, 0.25, 0.5, 0.75].map((t) => pointOn(s, t)));
export function area(points: Point[]): number {
  return (
    points.reduce((sum, p, i) => {
      const q = points[(i + 1) % points.length];
      return sum + p.x * q.y - q.x * p.y;
    }, 0) / 2
  );
}
export function center(points: Point[]): Point {
  if (!points.length) return { x: 0, y: 0 };
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
}
export function contains(polygon: Point[], point: Point): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

export const reverse = (contour: Contour): Contour =>
  [...contour].reverse().map((s) => [s[3], s[2], s[1], s[0]]);
export const collapse = (contour: Contour, at: Point): Contour =>
  contour.map(() => [at, at, at, at]);

/** Split curves without changing their shape. Quality affects alignment resolution. */
export function subdivide(contour: Contour, count: number): Contour {
  const result = [...contour];
  while (result.length < count) {
    let longest = 0,
      length = -1;
    for (let i = 0; i < result.length; i++) {
      const s = result[i];
      const n = distance(s[0], s[1]) + distance(s[1], s[2]) + distance(s[2], s[3]);
      if (n > length) {
        longest = i;
        length = n;
      }
    }
    result.splice(longest, 1, ...split(result[longest]));
  }
  return result;
}

/** Winding is established by topology first; only rotate the starting segment here. */
export function alignStart(from: Contour, to: Contour): Contour {
  const a = center(from.map((s) => s[0])),
    b = center(to.map((s) => s[0]));
  let best = 0,
    bestCost = Infinity;
  for (let offset = 0; offset < to.length; offset++) {
    let cost = 0;
    for (let i = 0; i < from.length; i++) {
      const p = from[i][0],
        q = to[(i + offset) % to.length][0];
      cost += (p.x - a.x - q.x + b.x) ** 2 + (p.y - a.y - q.y + b.y) ** 2;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = offset;
    }
  }
  return [...to.slice(best), ...to.slice(0, best)];
}

export function boundsOf(glyphs: Glyph[]): Bounds {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const glyph of glyphs)
    for (const contour of glyph.contours)
      for (const s of contour)
        for (const p of s) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
  return Number.isFinite(minX)
    ? { minX, minY, maxX, maxY }
    : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
}

export const union = (a: Bounds, b: Bounds): Bounds => ({
  minX: Math.min(a.minX, b.minX),
  minY: Math.min(a.minY, b.minY),
  maxX: Math.max(a.maxX, b.maxX),
  maxY: Math.max(a.maxY, b.maxY),
});
const number = (n: number) => String(Math.round(n * 10000) / 10000);
export const toPath = (contours: Contour[]): string =>
  contours
    .map((c) => {
      if (!c.length) return '';
      return (
        `M${number(c[0][0].x)} ${number(c[0][0].y)}` +
        c
          .map(
            (s) =>
              `C${s
                .slice(1)
                .map((p) => `${number(p.x)} ${number(p.y)}`)
                .join(' ')}`,
          )
          .join('') +
        'Z'
      );
    })
    .join('');
