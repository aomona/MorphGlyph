export type Point = { x: number; y: number };
/** A closed contour is a continuous sequence of cubic Bezier segments. */
export type Cubic = [Point, Point, Point, Point];
export type Contour = Cubic[];
export type Glyph = { contours: Contour[] };
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
export type Shape = { glyphs: Glyph[]; bounds: Bounds; advance: number };
export type Quality = 'fast' | 'balanced' | 'high';
export type Easing = 'smooth' | 'linear' | 'smoothstep' | 'smootherstep' | ((t: number) => number);
export type ContourPair = { from: Contour; to: Contour };
export type GlyphPair = { contours: ContourPair[] };
export type MorphPlan = { from: Shape; to: Shape; pairs: GlyphPair[]; bounds: Bounds };

export const clamp = (n: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? n : 0));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const mixPoint = (a: Point, b: Point, t: number): Point => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
});
