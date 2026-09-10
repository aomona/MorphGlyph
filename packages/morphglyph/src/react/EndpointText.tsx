import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { acquireBrowserFont } from '../fonts/browser-font';
import type { FontHandle } from '../fonts/font';

export function useBrowserFont(
  font: FontHandle,
  enabled: boolean,
  onError?: (error: Error) => void,
) {
  const [loaded, setLoaded] = useState<{ font: FontHandle; family: string } | null>(null);
  const errorCallback = useRef(onError);
  errorCallback.current = onError;
  useEffect(() => {
    if (!enabled) return;
    let stale = false;
    let release: (() => void) | undefined;
    try {
      const lease = acquireBrowserFont(font, document);
      release = lease.release;
      lease.ready
        .then((family) => {
          if (!stale) setLoaded({ font, family });
        })
        .catch((error) => {
          if (!stale) errorCallback.current?.(error);
        });
    } catch (error) {
      errorCallback.current?.(error instanceof Error ? error : new Error(String(error)));
    }
    return () => {
      stale = true;
      release?.();
    };
  }, [font, enabled]);
  return loaded?.font === font ? loaded.family : undefined;
}

/** Ordinary HTML stays outside the SVG so browser readers can discover it as text. */
export function EndpointText({
  text,
  font,
  family,
  size,
  spacing,
  advance,
  align,
  viewport,
  viewBox,
}: {
  text: string;
  font: FontHandle;
  family: string;
  size: number;
  spacing: number;
  advance: number;
  align: 'left' | 'center' | 'right';
  viewport: RefObject<SVGSVGElement | null>;
  viewBox: { x: number; y: number; width: number; height: number };
}) {
  const [projection, setProjection] = useState({ scale: 1, left: 0, top: 0 });
  useLayoutEffect(() => {
    const svg = viewport.current;
    if (!svg) return;
    const measure = () => {
      // CSS dimensions exclude ancestor transforms, which apply to both layers.
      const style = getComputedStyle(svg);
      const rect = { width: parseFloat(style.width), height: parseFloat(style.height) };
      const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);
      const left = (rect.width - viewBox.width * scale) / 2;
      const top = (rect.height - viewBox.height * scale) / 2;
      setProjection((previous) =>
        previous.scale === scale && previous.left === left && previous.top === top
          ? previous
          : { scale, left, top },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [viewport, viewBox.width, viewBox.height]);
  const scale = size / font.font.unitsPerEm;
  const ascent = font.font.ascender * scale;
  const height = (font.font.ascender - font.font.descender) * scale;
  const x = align === 'left' ? 0 : align === 'right' ? -advance : -advance / 2;
  return (
    <span
      data-morphglyph-text=""
      style={{
        display: 'inline-block',
        position: 'absolute',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        forcedColorAdjust: 'none',
        zIndex: 0,
        left: projection.left + (x - viewBox.x) * projection.scale,
        top: projection.top + (-ascent - viewBox.y) * projection.scale,
        fontFamily: `"${family}"`,
        fontSize: size * projection.scale,
        lineHeight: `${height * projection.scale}px`,
        letterSpacing: spacing * projection.scale,
        fontWeight: 400,
        fontStyle: 'normal',
        whiteSpace: 'pre',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        cursor: 'text',
        fontKerning: 'normal',
        fontVariantLigatures: 'common-ligatures',
      }}
    >
      {text}
    </span>
  );
}
