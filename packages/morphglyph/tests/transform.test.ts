import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseFont, layoutText, type FontHandle } from '../src/fonts/font';
import { createPlan, frame, arcPoint, trajectoryBounds } from '../src/core/transform';
import { pointOn, split, toPath, boundsOf } from '../src/core/geometry';
import type { Cubic } from '../src/core/types';

let font: FontHandle;
beforeAll(() => {
  const data = readFileSync(new URL('../assets/NotoSansJP-Regular.otf', import.meta.url));
  font = parseFont(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
});
const text = (s: string) => layoutText(font, s, 72, 0, 'center');

describe('Transform with the shipped Japanese font', () => {
  it.each([['before', 'after'], ['日', '田'], ['AOB8', '回'], ['こんにちは', 'MorphGlyph'], ['', '字'], ['字', ''], ['', ''], ['A A', 'AAA']])('preserves endpoints and finite geometry: %s → %s', (a, b) => {
    const from = text(a), to = text(b), plan = createPlan(from, to);
    expect(frame(plan, 0)).toBe(from);
    expect(frame(plan, 1)).toBe(to);
    for (const pathArc of [0, Math.PI / 3, -Math.PI, 2 * Math.PI]) {
      const box = trajectoryBounds(plan, pathArc);
      for (const progress of [.1, .25, .5, .75, .9]) {
        const current = frame(plan, progress, { pathArc, stagger: 40 });
        expect(current.glyphs.map(g => toPath(g.contours)).join()).not.toMatch(/NaN|Infinity/);
        if (current.glyphs.length) {
          const bounds = boundsOf(current.glyphs);
          expect(bounds.minX).toBeGreaterThanOrEqual(box.minX - .0001);
          expect(bounds.maxX).toBeLessThanOrEqual(box.maxX + .0001);
          expect(bounds.minY).toBeGreaterThanOrEqual(box.minY - .0001);
          expect(bounds.maxY).toBeLessThanOrEqual(box.maxY + .0001);
        }
      }
    }
  });

  it('keeps holes in the endpoint glyphs and is deterministic', () => {
    expect(text('田').glyphs[0].contours.length).toBeGreaterThan(1);
    const a = createPlan(text('日'), text('田'));
    const b = createPlan(text('日'), text('田'));
    expect(frame(a, .5)).toEqual(frame(b, .5));
  });

  it('accounts for whitespace without adding outline glyphs', () => {
    expect(text('A A').advance).toBeGreaterThan(text('AA').advance);
    expect(text('A A').glyphs).toHaveLength(2);
    expect(text('　 ').glyphs).toHaveLength(0);
    expect(text('　 ').advance).toBeGreaterThan(0);
  });

  it('rejects unavailable characters and excessive input', () => {
    expect(() => text('\u{10ffff}')).toThrow(/contain/);
    expect(() => text('a'.repeat(257))).toThrow(/256/);
  });

  it('can continue from an intermediate frame without jumping', () => {
    const middle = frame(createPlan(text('ABC'), text('XYZ')), .4);
    expect(frame(createPlan(middle, text('日本語')), 0)).toBe(middle);
  });
});

it('splits a Bezier without changing the curve', () => {
  const curve: Cubic = [{ x: 0, y: 0 }, { x: 40, y: 90 }, { x: 80, y: -20 }, { x: 100, y: 30 }];
  const [left, right] = split(curve);
  for (const t of [0, .2, .5, .7, 1]) {
    const p = pointOn(curve, t);
    const q = t <= .5 ? pointOn(left, t * 2) : pointOn(right, t * 2 - 1);
    expect(p.x).toBeCloseTo(q.x, 10); expect(p.y).toBeCloseTo(q.y, 10);
  }
});

it('uses a circle through both points and has a stable linear limit', () => {
  const a = { x: 0, y: 0 }, b = { x: 2, y: 0 };
  expect(arcPoint(a, b, .5, Math.PI).x).toBeCloseTo(1);
  expect(arcPoint(a, b, .5, Math.PI).y).toBeCloseTo(-1);
  expect(arcPoint(a, b, .5, 1e-9)).toEqual({ x: 1, y: 0 });
});
