# Validation

Recorded on 2026-09-10. These results cover version 0.1.0; they are not a
performance guarantee for arbitrary fonts, text lengths or devices.

## Automated checks

- TypeScript strict checking and production builds pass.
- 14 geometry tests use the actual bundled Noto Sans JP font. They exercise
  Japanese and Latin text, holes, unequal glyph counts, spaces, empty strings,
  missing glyphs, curve subdivision, exact endpoints, deterministic intermediate
  frames, finite coordinates and arc bounds (including negative angles).
- 7 Chromium integration tests cover real SVG paths, seeking, pause/resume,
  reverse, code copy, Japanese presets, missing-glyph fallback and recovery,
  reduced motion, loops, mobile layout, controlled progress, interruption
  continuity, source resets, React StrictMode and unmount cleanup.
- Desktop (1440 px) and mobile (390 px) screenshots were inspected. The
  playground uses white, black and gray and has no promotional subtitles.

## Packed-package consumers

A generated `.tgz` was installed into separate applications, rather than using
workspace source imports:

| Consumer                                  | Build  | Browser runtime                                         |
| ----------------------------------------- | ------ | ------------------------------------------------------- |
| React 18.3.1 + Vite 7.3.6                 | passed | Default font and progress 0.5 render; no browser errors |
| React 19.3.0 + Next.js 16.3.4 (Turbopack) | passed | Default font and progress 0.5 render; no browser errors |

Next.js also emitted the ordinary-text SSR fallback. The client replaced it
with SVG without hydration errors. Vite dependency optimization is enabled in
the consumer check; no `optimizeDeps.exclude` workaround is needed.

The default font is emitted as a separate lazy data module because relative
asset URLs inside optimized dependencies behave differently across bundlers.
It is ~6 MB before compression (~4.24 MB gzip), separate from the main bundle.
Custom `font` URLs avoid loading that module.

## Core timings

Node 24.21.0, macOS arm64, balanced quality, 64 px, arc π/4. Each case measures
60 intermediate frames including SVG path serialization. Font parsing took
83.87 ms in this run. This is a CPU benchmark, **not a browser FPS measurement**;
DOM updates, paint, compositing and font download are excluded.

| Workload                       | Preparation | Median frame | p95 frame | Control points |
| ------------------------------ | ----------- | ------------ | --------- | -------------- |
| 20 Latin glyphs                | 7.67 ms     | 0.64 ms      | 1.60 ms   | 2,620          |
| 21 → 20 Japanese glyphs        | 9.08 ms     | 1.31 ms      | 1.89 ms   | 5,788          |
| 10 × (21 → 20 Japanese glyphs) | 20.92 ms    | 9.30 ms      | 11.51 ms  | 57,880         |

The ten-instance case shares cached font/text geometry. Heavy fonts and long
strings can exceed a frame budget. The implementation caps input length and
geometry size; it does not move preparation to a worker.

## Review

CodeRabbit identified an opportunity to replace sampled arc bounds with
analytic extrema, non-finite angle handling, and a weak subpath assertion. All
three were checked against the code and addressed. Local tests were rerun.

## Scope

Only Chromium was used for the automated browser suite. Safari and Firefox
have not been runtime-certified. Arbitrary topology-changing morphs may
self-intersect; no claim is made that every intermediate frame preserves holes.
The bundled font does not cover every Unicode character or emoji.
