import type { CSSProperties, ReactNode } from 'react';
import type { Easing, Quality } from '../core/types';
import type { FontSource } from '../fonts/font';

export type MorphGlyphHandle = {
  play(): void;
  pause(): void;
  restart(): void;
  reverse(): void;
  seek(progress: number): void;
};

export type MorphGlyphBaseProps = {
  before: string;
  after: string;
  font?: FontSource;
  fontSize?: number;
  letterSpacing?: number;
  align?: 'left' | 'center' | 'right';
  easing?: Easing;
  /** Radians; clamped to ±1.9π to avoid full-circle singularities. */
  pathArc?: number;
  quality?: Quality;
  reducedMotion?: 'system' | 'always' | 'never';
  fallback?: ReactNode;
  onReady?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  /** Frame callback; use refs when updating a timeline to avoid per-frame React renders. */
  onUpdate?: (progress: number) => void;
  className?: string;
  style?: CSSProperties;
  id?: string;
  'aria-label'?: string;
  width?: number | string;
  height?: number | string;
};

export type AutomaticPlayback = {
  progress?: never;
  duration?: number;
  delay?: number;
  stagger?: number;
  playing?: boolean;
  loop?: boolean;
  direction?: 'normal' | 'reverse' | 'alternate';
};
export type ControlledPlayback = {
  progress: number;
  duration?: never;
  delay?: never;
  stagger?: never;
  playing?: never;
  loop?: never;
  direction?: never;
};
export type MorphGlyphProps = MorphGlyphBaseProps & (AutomaticPlayback | ControlledPlayback);
