import * as opentype from 'opentype.js';
import { boundsOf, contoursFromCommands } from '../core/geometry';
import type { Cubic, Shape } from '../core/types';

export type FontHandle = { readonly font: opentype.Font; readonly name: string };
export type FontSource = string | FontHandle;
const fonts = new Map<string, Promise<FontHandle>>();
const shapes = new WeakMap<FontHandle, Map<string, Shape>>();

export class MorphGlyphError extends Error {
  constructor(
    public readonly code: 'FONT_LOAD' | 'MISSING_GLYPH' | 'TEXT_LIMIT' | 'GEOMETRY',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'MorphGlyphError';
  }
}

/** Static TTF/OTF only. CSS font-family names and WOFF2 are not font sources. */
export function loadFont(source?: FontSource): Promise<FontHandle> {
  if (typeof source === 'object') return Promise.resolve(source);
  const url = source ?? '<bundled Noto Sans JP>';
  let pending = fonts.get(url);
  if (!pending) {
    const data =
      source === undefined
        ? import('./default-data.js').then(
            ({ default: base64 }) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer,
          )
        : fetch(url).then(async (response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.arrayBuffer();
          });
    pending = data
      .then((buffer) => parseFont(buffer, url))
      .catch((cause: unknown) => {
        if (fonts.get(url) === pending) fonts.delete(url);
        throw new MorphGlyphError('FONT_LOAD', `Could not load font: ${url}`, { cause });
      });
    fonts.set(url, pending);
    if (fonts.size > 8) fonts.delete(fonts.keys().next().value!);
  }
  return pending;
}

export function parseFont(buffer: ArrayBuffer, name = 'Custom font'): FontHandle {
  return { font: opentype.parse(buffer), name };
}

export function layoutText(
  handle: FontHandle,
  text: string,
  size: number,
  spacing: number,
  align: 'left' | 'center' | 'right',
): Shape {
  text = text.replace(/\r\n?|\n/g, ' ').normalize('NFC');
  if (Array.from(text).length > 256)
    throw new MorphGlyphError(
      'TEXT_LIMIT',
      'MorphGlyph supports up to 256 code points per string.',
    );
  const key = JSON.stringify([text, size, spacing, align]);
  let cache = shapes.get(handle);
  if (!cache) {
    cache = new Map();
    shapes.set(handle, cache);
  }
  const cached = cache.get(key);
  if (cached) return cached;
  const font = handle.font;
  const glyphs = font.stringToGlyphs(text);
  if (glyphs.some((g) => g.index === 0))
    throw new MorphGlyphError('MISSING_GLYPH', 'This font does not contain every requested glyph.');
  const scale = size / font.unitsPerEm;
  let x = 0;
  const result = glyphs
    .map((g, i) => {
      const contours = contoursFromCommands(g.getPath(x, 0, size).commands);
      if (contours.reduce((n, c) => n + c.length, 0) > 4096)
        throw new MorphGlyphError('GEOMETRY', 'A glyph exceeds the geometry safety limit.');
      x += (g.advanceWidth ?? font.unitsPerEm) * scale;
      if (i + 1 < glyphs.length) x += font.getKerningValue(g, glyphs[i + 1]) * scale + spacing;
      return { contours };
    })
    .filter((g) => g.contours.length > 0);
  const offset = align === 'left' ? 0 : align === 'right' ? -x : -x / 2;
  const shifted = result.map((g) => ({
    contours: g.contours.map((c) =>
      c.map((s) => s.map((p) => ({ x: p.x + offset, y: p.y })) as Cubic),
    ),
  }));
  const ink = boundsOf(shifted);
  const shape: Shape = {
    glyphs: shifted,
    advance: x,
    bounds: {
      minX: Math.min(ink.minX, offset),
      maxX: Math.max(ink.maxX, offset + x),
      minY: Math.min(ink.minY, -font.ascender * scale),
      maxY: Math.max(ink.maxY, -font.descender * scale),
    },
  };
  cache.set(key, shape);
  if (cache.size > 128) cache.delete(cache.keys().next().value!);
  return shape;
}
