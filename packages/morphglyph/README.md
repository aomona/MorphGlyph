# MorphGlyph

A React component that transforms one text outline into another using SVG paths.
Japanese and Latin text are supported by the bundled Noto Sans JP font.

[Playground](https://aomona.github.io/MorphGlyph/) · [Releases](https://github.com/aomona/MorphGlyph/releases)

```tsx
import { MorphGlyph } from 'morphglyph';

<MorphGlyph before="before" after="after" />;
```

## Installation

Install from npm:

```sh
npm install morphglyph
```

Requires React 18.2+ or 19 and an ESM bundler. Tested with Vite and Next.js.

To build a package from source:

```sh
git clone https://github.com/aomona/MorphGlyph.git
cd MorphGlyph
pnpm install
pnpm --filter morphglyph build
cd packages/morphglyph
pnpm pack
```

## Usage

```tsx
<MorphGlyph
  before="文字"
  after="かたち"
  fontSize={72}
  duration={1200}
  pathArc={Math.PI / 4}
  stagger={40}
  style={{ color: 'black' }}
/>
```

The component plays once after its font loads and holds the final shape. The
animation uses actual font outlines; it does not crossfade two text elements.
Glyphs are paired in display order, with unmatched outlines growing or shrinking.

### Controlled progress

```tsx
<MorphGlyph before="日" after="田" progress={0.5} />
```

`progress` is an uneased value from 0 to 1. It disables the internal clock and
cannot be combined with `playing`, `duration`, `delay`, `stagger`, `loop`, `loopDelay`, or
`direction`. The component always calculates this frame from `before` and `after`.

### Playback controls

```tsx
import { useRef } from 'react';
import { MorphGlyph, type MorphGlyphHandle } from 'morphglyph';

function Example() {
  const ref = useRef<MorphGlyphHandle>(null);
  return (
    <>
      <MorphGlyph ref={ref} before="Hello" after="World" />
      <button onClick={() => ref.current?.restart()}>Replay</button>
      <button onClick={() => ref.current?.pause()}>Pause</button>
    </>
  );
}
```

The handle provides `play()`, `pause()`, `restart()`, `reverse()` and
`seek(progress)`. Seeking retains the play/pause state. These methods have no
effect in controlled-progress mode. An explicitly supplied `playing` prop takes
precedence over `play()` and `pause()`; omit it when using ref controls.
`play()` resumes a paused run; use `restart()` to replay a completed run.

### Custom fonts

```tsx
<MorphGlyph before="Hello" after="World" font="/fonts/MyFont-Regular.otf" />
```

Use a static TTF/OTF file URL, not a CSS font-family or Google Fonts stylesheet.
Cross-origin URLs must permit CORS. The default font is loaded on demand as a separate data module; no font CDN
or custom asset-loader configuration is required. It contains the ~4.5 MB
font as base64 (~6 MB before compression). This keeps the font out of the
main production JavaScript entry and works with Vite dependency optimization
and Next.js. Pass your own font URL to avoid loading this module.

Share a font across components:

```tsx
import { MorphGlyphProvider, MorphGlyph, loadFont } from 'morphglyph';

const font = await loadFont('/fonts/MyFont-Regular.otf');

<MorphGlyphProvider font={font}>
  <MorphGlyph before="Hello" after="World" />
  <MorphGlyph before="123" after="456" />
</MorphGlyphProvider>;
```

`parseFont(arrayBuffer, name?)` creates a handle without fetching a URL. Use it
for uploaded files or fonts already loaded in memory. URL loads and text geometry
are cached with bounded entry counts. Failed loads can be retried.

## API

All time values are milliseconds. Dimensions and letter spacing use SVG units
(equivalent to pixels at natural size).

| Prop                       | Default               | Description                                                                               |
| -------------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| `before`, `after`          | required              | Text strings; empty strings are valid.                                                    |
| `font`                     | Noto Sans JP Regular  | Static TTF/OTF URL or `FontHandle`.                                                       |
| `fontSize`                 | `64`                  | Positive number.                                                                          |
| `letterSpacing`            | `0`                   | Additional space between glyphs.                                                          |
| `align`                    | `'center'`            | `'left'`, `'center'`, or `'right'`.                                                       |
| `duration`                 | `1000`                | Total one-way duration, including stagger. Zero finishes immediately.                     |
| `delay`                    | `0`                   | Initial/restart delay.                                                                    |
| `easing`                   | `'smooth'`            | `'linear'`, `'smoothstep'`, `'smootherstep'`, or `(t) => number`. Output is clamped.      |
| `pathArc`                  | `0`                   | Radians, clamped to ±1.9π. Positive angles rotate clockwise in SVG coordinates.           |
| `stagger`                  | `0`                   | Start delay per glyph. Excessive values are reduced to fit the total duration.            |
| `playing`                  | uncontrolled          | Supplying a boolean controls play/pause. Otherwise autoplay is enabled.                   |
| `loopDelay`                | `0`                   | Milliseconds to hold each endpoint between loop intervals.                                |
| `selectable`               | `true`                | Enable an HTML text layer for selection and reading at known endpoints.                   |
| `loop`                     | `false`               | Repeat. Provide a pause control when using loops.                                         |
| `direction`                | `'normal'`            | `'normal'`, `'reverse'`, `'alternate'`. Alternate reverses each loop.                     |
| `progress`                 | —                     | Controlled progress, 0–1. See the exclusions above.                                       |
| `quality`                  | `'balanced'`          | `'fast'`, `'balanced'`, `'high'`; controls curve alignment resolution.                    |
| `reducedMotion`            | `'system'`            | `'system'`, `'always'`, `'never'`. Reduced motion uses static endpoints and stops loops.  |
| `width`, `height`          | natural bounds        | SVG dimensions or fallback dimensions.                                                    |
| `fallback`                 | ordinary text         | Content used while loading or when font/geometry preparation fails.                       |
| `onReady`                  | —                     | A new morph plan has been prepared.                                                       |
| `onStart`                  | —                     | A one-way playback interval starts.                                                       |
| `onComplete`               | —                     | Playback reaches an endpoint; once per interval, including loops.                         |
| `onUpdate`                 | —                     | `(progress: number) => void` on rendered frames. Prefer refs over state in this callback. |
| `onError`                  | —                     | `(error: Error) => void` for preparation errors.                                          |
| `id`, `className`, `style` | —                     | Applied to the root span. Color is inherited through `currentColor`.                      |
| `aria-label`               | current endpoint text | Override the accessible label.                                                            |

### Updates and accessibility

- An unchanged render does not restart playback.
- Changing only `after` uses the current displayed geometry as the new starting
  point. Position is continuous; velocity continuity is not guaranteed.
- Changing `before` resets the pair. Font or layout changes rebuild the pair.
- Changing `direction` restarts automatic playback in that direction.
- Controlled progress never fires `onStart` or `onComplete`.
- The server and initial client render show the same ordinary-text fallback.
  SVG appears after client-side preparation. Supply dimensions to reserve space.
- At 0% and 100%, selectable HTML text uses the same font and follows the SVG
  viewport. The SVG remains the visual layer, so enabling selection changes no
  rendered pixels. The transparent HTML layer provides native selection, copying,
  and ordinary text in the accessibility tree; the SVG is hidden from readers.
- Between endpoints, the root exposes an image label that switches at the midpoint
  without a live announcement. An interrupted intermediate shape is not exposed
  as selectable source text. `aria-label` overrides ordinary-text semantics.
- Use `selectable={false}` for decorative labels inside a separately named button.
  Use `loopDelay` to give users time at endpoints and pause playback when selection
  starts. The playground holds endpoints for one second and pauses on text press.
- Browser accessibility-tree and clipboard behavior are tested in Chromium.
  VoiceOver, NVDA, and browser reader modes have not been manually verified.
- Reduced motion skips geometric animation. Controlled progress shows the source
  below 0.5 and the target at or above 0.5.
- Animation clocks stop while the document is hidden and resume when visible.

### Limits

Version 0.2 targets single-line horizontal Japanese and Latin text. Newlines
become spaces, and text is normalized to NFC. The bundled font cannot contain
all Unicode characters; missing glyphs report an error and show the fallback.
Strings are limited to 256 code points to bound preparation cost.

WOFF2, variable axes, color emoji, complex-script shaping, vertical writing,
multiline layout, per-glyph styling and `TransformMatchingShapes` are not part of
this version. Contour topology can change during a morph; arbitrary shapes may
self-intersect at intermediate frames. Outer/hole winding is preserved for
nonzero filling, but perfect intermediate topology is not guaranteed.

The package contains no global stylesheet. The library updates SVG paths through
`requestAnimationFrame`; React owns the shell, not the per-frame path attributes.

## Development

```sh
pnpm install
pnpm dev             # build library and run playground
pnpm check           # TypeScript
pnpm test            # real-font geometry tests
pnpm build           # package and static playground
pnpm exec playwright install chromium
pnpm test:e2e        # playback, controlled frames, lifecycle, accessibility
```

[Validation notes](docs/validation.md) record the tested environments and limits.
The GitHub Actions workflow runs checks before deploying `examples/playground/dist`
to GitHub Pages. Pull requests run checks without deploying.

## Inspiration

MorphGlyph is inspired by [Manim Community](https://www.manim.community/),
particularly [Transform](https://docs.manim.community/en/stable/reference/manim.animation.transform.Transform.html):
aligning the structure and points of two shapes and interpolating between them.

This is an independent React/SVG implementation. It is not affiliated with or
endorsed by the Manim Community and does not promise Manim API or pixel compatibility.

## License

Code: [MIT](LICENSE), copyright 2026 aomona.
The unmodified bundled Noto Sans JP font is separately licensed under the
[SIL Open Font License 1.1](packages/morphglyph/assets/OFL.txt).
