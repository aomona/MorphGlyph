import { MorphGlyph } from 'morphglyph';

/** The native button owns its accessible name; this is only its visual label. */
export function MorphLabel({
  before,
  text,
  width,
  size = 12,
  height = 18,
}: {
  before: string;
  text: string;
  width: number;
  size?: number;
  height?: number;
}) {
  return (
    <span aria-hidden="true" className="morph-label">
      <MorphGlyph
        before={before}
        after={text}
        duration={220}
        fontSize={size}
        width={width}
        height={height}
        selectable={false}
      />
    </span>
  );
}
