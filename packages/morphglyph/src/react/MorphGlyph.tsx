import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPlan } from '../core/transform';
import type { MorphPlan, Shape } from '../core/types';
import { layoutText, loadFont, MorphGlyphError } from '../fonts/font';
import { useSharedFont } from './provider';
import { idleControls, Surface } from './Surface';
import type { MorphGlyphHandle, MorphGlyphProps } from './types';
import { useReducedMotion } from './useReducedMotion';

export const MorphGlyph = forwardRef<MorphGlyphHandle, MorphGlyphProps>(function MorphGlyph(props, ref) {
  const { before, after, fontSize = 64, letterSpacing = 0, align = 'center', quality = 'balanced' } = props;
  const shared = useSharedFont();
  const font = props.font ?? shared;
  const [plan, setPlan] = useState<MorphPlan | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [atEnd, setAtEnd] = useState(false);
  const snapshot = useRef<Shape | null>(null);
  const controls = useRef(idleControls());
  const callbacks = useRef(props);
  callbacks.current = props;
  const previous = useRef<{ before: string; after: string; font: typeof font; fontSize: number; letterSpacing: number; align: string } | null>(null);
  const reduced = useReducedMotion(props.reducedMotion ?? 'system');
  const controlled = props.progress !== undefined;

  useImperativeHandle(ref, () => ({
    play: () => controls.current.play(), pause: () => controls.current.pause(),
    restart: () => controls.current.restart(), reverse: () => controls.current.reverse(),
    seek: p => controls.current.seek(p),
  }), []);

  useEffect(() => {
    let stale = false;
    loadFont(font).then(handle => {
      if (stale) return;
      if (!Number.isFinite(fontSize) || fontSize <= 0 || !Number.isFinite(letterSpacing)) throw new MorphGlyphError('GEOMETRY', 'fontSize must be positive and letterSpacing must be finite.');
      const target = layoutText(handle, after, fontSize, letterSpacing, align);
      const old = previous.current;
      const continuing = !controlled && old && old.before === before && old.after !== after && old.font === font && old.fontSize === fontSize && old.letterSpacing === letterSpacing && old.align === align;
      const source = continuing && snapshot.current ? snapshot.current : layoutText(handle, before, fontSize, letterSpacing, align);
      const next = createPlan(source, target, quality);
      previous.current = { before, after, font, fontSize, letterSpacing, align };
      setError(null); setPlan(next);
      callbacks.current.onReady?.();
    }).catch((cause: unknown) => {
      if (stale) return;
      const failure = cause instanceof Error ? cause : new Error(String(cause));
      setError(failure); setPlan(null);
      callbacks.current.onError?.(failure);
    });
    return () => { stale = true; };
  }, [before, after, font, fontSize, letterSpacing, align, quality, controlled]);

  const label = props['aria-label'] ?? (atEnd ? after : before);
  return <span id={props.id} className={props.className} role="img" aria-label={label} data-morphglyph="" data-state={error ? 'error' : plan ? 'ready' : 'loading'} style={{ display: 'inline-block', verticalAlign: 'middle', color: 'inherit', ...props.style }}>
    {plan && !error
      ? <Surface plan={plan} options={props} reduced={reduced} snapshot={snapshot} controls={controls} semantic={setAtEnd} />
      : <span aria-hidden="true" style={{ display: 'inline-block', fontSize, whiteSpace: 'pre', width: props.width, height: props.height }}>{props.fallback !== undefined ? props.fallback : error ? after : before}</span>}
  </span>;
});
