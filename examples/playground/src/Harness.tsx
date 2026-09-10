import { useRef, useState } from 'react';
import { MorphGlyph, type MorphGlyphHandle } from 'morphglyph';

/** Development-only integration fixture. Removed from the production build. */
export function Harness() {
  const control = useRef<MorphGlyphHandle>(null);
  const [before, setBefore] = useState('ABC');
  const [after, setAfter] = useState('XYZ');
  const [progress, setProgress] = useState(0.4);
  const [controlled, setControlled] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [starts, setStarts] = useState(0),
    [ends, setEnds] = useState(0);
  const [count, setCount] = useState(1);
  return (
    <div>
      <label>
        Source
        <input value={before} onChange={(e) => setBefore(e.target.value)} />
      </label>
      <label>
        Target
        <input value={after} onChange={(e) => setAfter(e.target.value)} />
      </label>
      <label>
        Controlled
        <input
          type="checkbox"
          checked={controlled}
          onChange={(e) => setControlled(e.target.checked)}
        />
      </label>
      <label>
        Frame
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
        />
      </label>
      <button onClick={() => control.current?.restart()}>Restart</button>
      <button onClick={() => control.current?.pause()}>Pause</button>
      <button onClick={() => control.current?.play()}>Play</button>
      <button onClick={() => control.current?.reverse()}>Reverse</button>
      <button onClick={() => setMounted(!mounted)}>Mount</button>
      <button onClick={() => setCount(10)}>Ten instances</button>
      <output data-testid="events">
        {starts}/{ends}
      </output>
      {mounted &&
        Array.from({ length: count }, (_, i) => (
          <MorphGlyph
            key={i}
            ref={i === 0 ? control : undefined}
            before={before}
            after={after}
            fontSize={40}
            onStart={() => setStarts((n) => n + 1)}
            onComplete={() => setEnds((n) => n + 1)}
            {...(controlled ? { progress } : { duration: 1000 })}
          />
        ))}
    </div>
  );
}
