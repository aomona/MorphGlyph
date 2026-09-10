import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { toPath } from '../core/geometry';
import { frame, trajectoryBounds } from '../core/transform';
import { clamp, type MorphPlan, type Shape } from '../core/types';
import type { MorphGlyphHandle, MorphGlyphProps } from './types';

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
}: {
  plan: MorphPlan;
  options: MorphGlyphProps;
  reduced: boolean;
  snapshot: MutableRefObject<Shape | null>;
  controls: MutableRefObject<MorphGlyphHandle>;
  semantic: (end: boolean) => void;
}) {
  const group = useRef<SVGGElement>(null);
  const latest = useRef({ options, reduced, semantic });
  latest.current = { options, reduced, semantic };
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
    let lastEnd: boolean | undefined;
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
      if (lastEnd !== actual >= 0.5) {
        lastEnd = actual >= 0.5;
        latest.current.semantic(lastEnd);
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
          if (o.direction === 'alternate') sign *= -1;
          else position = sign > 0 ? 0 : 1;
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
  }, [plan, controls, snapshot]);

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
  ]);
  useEffect(() => {
    controls.current.restart();
  }, [options.direction, controls]);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-morphglyph-svg=""
      viewBox={`${box.minX - pad} ${box.minY - pad} ${width} ${height}`}
      width={options.width ?? width}
      height={options.height ?? height}
      style={{ display: 'block', maxWidth: '100%', overflow: 'visible' }}
      fill="currentColor"
    >
      <g ref={group} />
    </svg>
  );
}
