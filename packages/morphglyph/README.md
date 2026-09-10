# MorphGlyph

Manim-inspired glyph transformations for React.

```tsx
import { MorphGlyph } from 'morphglyph';

<MorphGlyph before="before" after="after" />
```

Under development. See [the implementation plan](PLAN.md).

## Inspiration

MorphGlyph is inspired by the transformation system of
[Manim Community](https://www.manim.community/), particularly `Transform`:
aligning the structure and points of two shapes, then interpolating between them.
This is an independent implementation for React and SVG, and is not affiliated
with or endorsed by the Manim Community. It does not provide Manim API or rendering compatibility.

## License

Code: [MIT](LICENSE). The bundled Noto font is separately licensed under the
SIL Open Font License 1.1; its license is distributed alongside the font.
