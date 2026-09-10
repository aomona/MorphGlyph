import {
  alignStart,
  area,
  boundsOf,
  center,
  collapse,
  contains,
  reverse,
  sample,
  subdivide,
  union,
} from './geometry';
import {
  clamp,
  mix,
  mixPoint,
  type Contour,
  type ContourPair,
  type Cubic,
  type Easing,
  type Glyph,
  type MorphPlan,
  type Point,
  type Quality,
  type Shape,
} from './types';

type Outline = {
  contour: Contour;
  center: Point;
  area: number;
  depth: number;
  parent: number;
  original: number;
};
function topology(contours: Contour[]): Outline[] {
  const polygons = contours.map(sample);
  const sizes = polygons.map((p) => Math.abs(area(p)));
  return contours
    .map((contour, i) => {
      const containers = polygons
        .map((p, j) => ({ p, j }))
        .filter(({ p, j }) => sizes[j] > sizes[i] + 1e-6 && contains(p, polygons[i][0]));
      const parent = containers.sort((a, b) => sizes[a.j] - sizes[b.j])[0]?.j ?? -1;
      const depth = containers.length;
      const desiredSign = depth % 2 === 0 ? 1 : -1;
      return {
        contour: Math.sign(area(polygons[i])) === desiredSign ? contour : reverse(contour),
        center: center(polygons[i]),
        area: sizes[i],
        depth,
        parent,
        original: i,
      };
    })
    .sort((a, b) => a.depth - b.depth || b.area - a.area);
}

function pairContours(a: Glyph, b: Glyph, quality: Quality): ContourPair[] {
  const from = topology(a.contours),
    to = topology(b.contours);
  const used = new Set<number>();
  const parents = new Map<number, number>();
  const pairs: ContourPair[] = [];
  const ac = center(from.map((c) => c.center)),
    bc = center(to.map((c) => c.center));
  const minimum = { fast: 12, balanced: 24, high: 48 }[quality];
  for (const source of from) {
    let best = -1,
      cost = Infinity;
    to.forEach((target, j) => {
      if (used.has(j) || source.depth !== target.depth) return;
      if (source.parent !== -1 && parents.get(source.parent) !== target.parent) return;
      const score =
        Math.hypot(
          source.center.x - ac.x - target.center.x + bc.x,
          source.center.y - ac.y - target.center.y + bc.y,
        ) + Math.abs(Math.sqrt(source.area) - Math.sqrt(target.area));
      if (score < cost) {
        cost = score;
        best = j;
      }
    });
    if (best === -1) {
      // Shrink in place; do not reverse a hole or drag it through unrelated strokes.
      pairs.push({ from: source.contour, to: collapse(source.contour, source.center) });
    } else {
      used.add(best);
      parents.set(source.original, to[best].original);
      const count = Math.max(minimum, source.contour.length, to[best].contour.length);
      if (count > 512) throw new Error('A contour exceeds the 512-segment safety limit.');
      const start = subdivide(source.contour, count),
        end = subdivide(to[best].contour, count);
      pairs.push({ from: start, to: alignStart(start, end) });
    }
  }
  to.forEach((target, i) => {
    if (!used.has(i))
      pairs.push({ from: collapse(target.contour, target.center), to: target.contour });
  });
  return pairs;
}

export function createPlan(from: Shape, to: Shape, quality: Quality = 'balanced'): MorphPlan {
  const pairs = Array.from({ length: Math.max(from.glyphs.length, to.glyphs.length) }, (_, i) => ({
    contours: pairContours(
      from.glyphs[i] ?? { contours: [] },
      to.glyphs[i] ?? { contours: [] },
      quality,
    ),
  }));
  return { from, to, pairs, bounds: union(from.bounds, to.bounds) };
}

export function ease(t: number, easing: Easing = 'smooth'): number {
  t = clamp(t);
  if (t === 0 || t === 1) return t;
  if (typeof easing === 'function') return clamp(easing(t));
  if (easing === 'linear') return t;
  if (easing === 'smoothstep') return t * t * (3 - 2 * t);
  if (easing === 'smootherstep') return t ** 3 * (t * (6 * t - 15) + 10);
  const sigmoid = (v: number) => 1 / (1 + Math.exp(-v));
  const error = sigmoid(-5);
  return clamp((sigmoid(10 * (t - 0.5)) - error) / (1 - 2 * error));
}

/** Positive angles rotate clockwise in SVG's downward-positive coordinate system. */
export function arcPoint(a: Point, b: Point, t: number, angle: number): Point {
  if (t <= 0) return a;
  if (t >= 1) return b;
  angle = clamp(angle, -Math.PI * 1.9, Math.PI * 1.9);
  if (Math.abs(angle) < 1e-5) return mixPoint(a, b, t);
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const factor = 1 / (2 * Math.tan(angle / 2));
  const cx = (a.x + b.x) / 2 - dy * factor;
  const cy = (a.y + b.y) / 2 + dx * factor;
  const cos = Math.cos(angle * t),
    sin = Math.sin(angle * t);
  return {
    x: cx + (a.x - cx) * cos - (a.y - cy) * sin,
    y: cy + (a.x - cx) * sin + (a.y - cy) * cos,
  };
}

export function frame(
  plan: MorphPlan,
  progress: number,
  options: { easing?: Easing; pathArc?: number; stagger?: number; duration?: number } = {},
): Shape {
  const p = clamp(progress);
  if (p === 0) return plan.from;
  if (p === 1) return plan.to;
  const duration = Math.max(0, options.duration ?? 1000);
  const gap = Math.min(
    Math.max(0, options.stagger ?? 0),
    (duration * 0.9) / Math.max(1, plan.pairs.length - 1),
  );
  const active = Math.max(1e-9, duration - gap * (plan.pairs.length - 1));
  const glyphs = plan.pairs.map((pair, i) => {
    const t = ease(duration === 0 ? 1 : clamp((p * duration - i * gap) / active), options.easing);
    return {
      contours: pair.contours.map((c) =>
        c.from.map(
          (s, j) => s.map((v, k) => arcPoint(v, c.to[j][k], t, options.pathArc ?? 0)) as Cubic,
        ),
      ),
    };
  });
  return { glyphs, bounds: boundsOf(glyphs), advance: mix(plan.from.advance, plan.to.advance, p) };
}

/** Convex control bounds of the full circular trajectories (conservative, stable). */
export function trajectoryBounds(plan: MorphPlan, angle: number) {
  const bounds = { ...plan.bounds };
  angle = clamp(angle, -Math.PI * 1.9, Math.PI * 1.9);
  if (Math.abs(angle) < 1e-5) return bounds;
  const factor = 1 / (2 * Math.tan(angle / 2));
  const turn = Math.PI * 2;
  const modulo = (n: number) => ((n % turn) + turn) % turn;
  for (const pair of plan.pairs)
    for (const c of pair.contours)
      for (let i = 0; i < c.from.length; i++)
        for (let k = 0; k < 4; k++) {
          const a = c.from[i][k],
            b = c.to[i][k];
          const cx = (a.x + b.x) / 2 - (b.y - a.y) * factor;
          const cy = (a.y + b.y) / 2 + (b.x - a.x) * factor;
          const radius = Math.hypot(a.x - cx, a.y - cy);
          const start = Math.atan2(a.y - cy, a.x - cx);
          // Coordinate extrema can only occur at cardinal angles on the sweep.
          for (const cardinal of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
            const traveled = angle > 0 ? modulo(cardinal - start) : modulo(start - cardinal);
            if (traveled > Math.abs(angle) + 1e-10) continue;
            const x = cx + radius * Math.cos(cardinal);
            const y = cy + radius * Math.sin(cardinal);
            bounds.minX = Math.min(bounds.minX, x);
            bounds.maxX = Math.max(bounds.maxX, x);
            bounds.minY = Math.min(bounds.minY, y);
            bounds.maxY = Math.max(bounds.maxY, y);
          }
        }
  return bounds;
}
