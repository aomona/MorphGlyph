import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { toPath } from '../core/geometry';
import { frame, trajectoryBounds } from '../core/transform';
import { clamp, type MorphPlan, type Shape } from '../core/types';
import type { MorphGlyphHandle, MorphGlyphProps } from './types';
import type { FontHandle } from '../fonts/font';
import { EndpointText, useBrowserFont } from './EndpointText';

export type SurfaceSemantics = { label: string; selectable: boolean };

const noop = () => {};
export const idleControls = (): MorphGlyphHandle => ({
  play: noop,
  pause: noop,
  restart: noop,
  reverse: noop,
  seek: noop,
});

/** React owns the SVG shell; the renderer exclusively owns this group's children. */
export function Surface({
  plan,
  options,
  reduced,
  snapshot,
  controls,
  semantic,
  font,
  fromText,
  toText,
  snapshotText,
}: {
  plan: MorphPlan;
  options: MorphGlyphProps;
  reduced: boolean;
  snapshot: MutableRefObject<Shape | null>;
  controls: MutableRefObject<MorphGlyphHandle>;
  semantic: (value: SurfaceSemantics) => void;
  font: FontHandle;
  fromText: string | null;
  toText: string;
  snapshotText: MutableRefObject<string | null>;
}) {
  const group = useRef<SVGGElement>(null);
  const viewport = useRef<SVGSVGElement>(null);
  const family = useBrowserFont(font, options.selectable !== false, options.onError);
  const [endpoint, setEndpoint] = useState<0 | 1 | null>(null);
  const latest = useRef({ options, reduced, semantic, family, fromText, toText });
  latest.current = { options, reduced, semantic, family, fromText, toText };
  const sync = useRef<() => void>(noop);
  const box = useMemo(() => trajectoryBounds(plan, options.pathArc ?? 0), [plan, options.pathArc]);
  const pad = 2;
  const width = Math.max(1, box.maxX - box.minX + pad * 2);
  const height = Math.max(1, box.maxY - box.minY + pad * 2);

  useLayoutEffect(() => {
    const container = group.current!;
    const paths: SVGPathElement[] = [];
    let position = latest.current.options.direction === 'reverse' ? 1 : 0;
    let sign = latest.current.options.direction === 'reverse' ? -1 : 1;
    let running = latest.current.options.playing !== false;
    let previous = 0;
    let wait = Math.max(0, latest.current.options.delay ?? 0);
    let started = false,
      completed = false,
      disposed = false,
      raf = 0;
    let lastEndpoint: 0 | 1 | null | undefined;
    let lastSemantic: SurfaceSemantics | undefined;
    let pendingLoop = false;
    const draw = () => {
      const { options: o, reduced: r } = latest.current;
      const actual = o.progress !== undefined ? clamp(o.progress) : position;
      const display = r ? (actual < 0.5 ? 0 : 1) : actual;
      const shape = frame(plan, display, {
        easing: o.easing,
        pathArc: o.pathArc,
        stagger: o.stagger,
        duration: o.duration,
      });
      snapshot.current = shape;
      const endpoint = display === 0 && fromText !== null ? 0 : display === 1 ? 1 : null;
      snapshotText.current = endpoint === 0 ? fromText : endpoint === 1 ? toText : null;
      if (lastEndpoint !== endpoint) {
        lastEndpoint = endpoint;
        setEndpoint(endpoint);
      }
      while (paths.length < shape.glyphs.length) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill-rule', 'nonzero');
        container.appendChild(path);
        paths.push(path);
      }
      paths.forEach((path, i) =>
        path.setAttribute('d', shape.glyphs[i] ? toPath(shape.glyphs[i].contours) : ''),
      );
      container.dataset.progress = String(actual);
      o.onUpdate?.(actual);
      const nextSemantic = {
        label: actual >= 0.5 ? toText : (fromText ?? o.before),
        selectable: endpoint !== null && !!latest.current.family && o.selectable !== false,
      };
      if (
        lastSemantic?.label !== nextSemantic.label ||
        lastSemantic.selectable !== nextSemantic.selectable
      ) {
        lastSemantic = nextSemantic;
        latest.current.semantic(nextSemantic);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      previous = 0;
    };
    const schedule = () => {
      if (
        !disposed &&
        !raf &&
        running &&
        !completed &&
        document.visibilityState !== 'hidden' &&
        latest.current.options.progress === undefined
      )
        raf = requestAnimationFrame(tick);
    };
    const tick = (now: number) => {
      raf = 0;
      if (disposed) return;
      const { options: o, reduced: r } = latest.current;
      if (o.progress !== undefined || !running || o.playing === false) {
        previous = 0;
        return;
      }
      let elapsed = previous ? now - previous : 0;
      previous = now;
      if (wait > 0) {
        const consumed = Math.min(wait, elapsed);
        wait -= consumed;
        elapsed -= consumed;
      }
      if (wait > 0) {
        schedule();
        return;
      }
      if (pendingLoop) {
        pendingLoop = false;
        if (o.direction === 'alternate') sign *= -1;
        else position = sign > 0 ? 0 : 1;
      }
      if (!started) {
        started = true;
        o.onStart?.();
      }
      const duration = Math.max(0, o.duration ?? 1000);
      position =
        r || duration === 0 ? (sign > 0 ? 1 : 0) : clamp(position + (sign * elapsed) / duration);
      draw();
      if ((sign > 0 && position >= 1) || (sign < 0 && position <= 0)) {
        completed = true;
        o.onComplete?.();
        if (o.loop && !r && duration > 0) {
          completed = false;
          started = false;
          pendingLoop = true;
          wait = Math.max(0, o.loopDelay ?? 0);
        }
      }
      schedule();
    };
    controls.current = {
      play() {
        if (
          latest.current.options.progress !== undefined ||
          latest.current.options.playing === false
        )
          return;
        running = true;
        schedule();
      },
      pause() {
        if (
          latest.current.options.progress !== undefined ||
          latest.current.options.playing === true
        )
          return;
        running = false;
        stop();
      },
      restart() {
        if (latest.current.options.progress !== undefined) return;
        stop();
        sign = latest.current.options.direction === 'reverse' ? -1 : 1;
        position = sign > 0 ? 0 : 1;
        completed = false;
        started = false;
        wait = Math.max(0, latest.current.options.delay ?? 0);
        pendingLoop = false;
        running = latest.current.options.playing !== false;
        draw();
        schedule();
      },
      reverse() {
        if (latest.current.options.progress !== undefined) return;
        stop();
        sign *= -1;
        completed = false;
        started = false;
        wait = 0;
        pendingLoop = false;
        running = latest.current.options.playing !== false;
        draw();
        schedule();
      },
      seek(progress) {
        if (latest.current.options.progress !== undefined) return;
        stop();
        position = clamp(progress);
        completed = false;
        wait = 0;
        pendingLoop = false;
        draw();
        schedule();
      },
    };
    sync.current = () => {
      const o = latest.current.options;
      if (o.progress !== undefined) {
        stop();
        draw();
        return;
      }
      if (o.playing !== undefined) running = o.playing;
      if (!running) stop();
      draw();
      schedule();
    };
    const visibilityChanged = () => {
      stop();
      if (document.visibilityState !== 'hidden') schedule();
    };
    document.addEventListener('visibilitychange', visibilityChanged);
    draw();
    schedule();
    return () => {
      disposed = true;
      stop();
      document.removeEventListener('visibilitychange', visibilityChanged);
      container.replaceChildren();
      controls.current = idleControls();
      sync.current = noop;
    };
  }, [plan, controls, snapshot, snapshotText, fromText, toText]);

  useEffect(() => {
    sync.current();
  }, [
    options.progress,
    options.playing,
    options.easing,
    options.pathArc,
    options.duration,
    options.stagger,
    reduced,
    family,
    options.selectable,
  ]);
  useEffect(() => {
    controls.current.restart();
  }, [options.direction, controls]);

  const nativeEndpoint = options.selectable !== false && family ? endpoint : null;
  const text = nativeEndpoint === 0 ? fromText : nativeEndpoint === 1 ? toText : null;
  return (
    <span style={{ display: 'block', position: 'relative' }}>
      <svg
        ref={viewport}
        aria-hidden="true"
        focusable="false"
        data-morphglyph-svg=""
        viewBox={`${box.minX - pad} ${box.minY - pad} ${width} ${height}`}
        width={options.width ?? width}
        height={options.height ?? height}
        style={{
          display: 'block',
          maxWidth: '100%',
          overflow: 'visible',
          position: 'relative',
          zIndex: 1,
          // Keep SVG rasterization independent of the selectable text layer.
          transform: 'translateZ(0)',
          pointerEvents: 'none',
        }}
        fill="currentColor"
      >
        <g ref={group} aria-hidden="true" />
      </svg>
      {text !== null && family && (
        <EndpointText
          text={text}
          font={font}
          family={family}
          size={options.fontSize ?? 64}
          spacing={options.letterSpacing ?? 0}
          advance={nativeEndpoint === 0 ? plan.from.advance : plan.to.advance}
          align={options.align ?? 'center'}
          viewport={viewport}
          viewBox={{ x: box.minX - pad, y: box.minY - pad, width, height }}
        />
      )}
    </span>
  );
}
