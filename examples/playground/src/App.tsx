import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import {
  MorphGlyph,
  parseFont,
  type Easing,
  type MorphGlyphHandle,
  type FontHandle,
  type Quality,
} from 'morphglyph';
import { MorphLabel } from './MorphLabel';

function Icon({
  name,
}: {
  name: 'play' | 'pause' | 'reset' | 'reverse' | 'arrow' | 'copy' | 'github';
}) {
  const paths = {
    play: 'm8 5 11 7-11 7Z',
    pause: 'M8 5v14M16 5v14',
    reset: 'M3 10a9 9 0 1 1 1.5 7M3 4v6h6',
    reverse: 'm8 4-5 5 5 5M3 9h12a6 6 0 0 1 0 12',
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    copy: 'M9 8h11v13H9ZM15 8V3H4v13h5',
    github:
      'M9 19c-4 1-4-2-6-2m12 5v-4c0-1 .1-1.5-.5-2 3-.4 6-1.5 6-6a5 5 0 0 0-1.5-3.5c.2-.8.2-2-.3-3.5 0 0-1.3 0-3.7 1.5a13 13 0 0 0-6 0C6.6 3 5.3 3 5.3 3c-.5 1.5-.5 2.7-.3 3.5A5 5 0 0 0 3.5 10c0 4.5 3 5.6 6 6-.6.5-.5 1.3-.5 2v4',
  };
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill={name === 'play' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

const presets = [
  { before: 'Hello', after: 'World', label: 'Hello → World' },
  { before: '文字', after: 'かたち', label: '文字 → かたち' },
  { before: '日', after: '田', label: '日 → 田' },
  { before: '123', after: '4567', label: '123 → 4567' },
];

export function App() {
  const [before, setBefore] = useState('Hello');
  const [after, setAfter] = useState('World');
  const [duration, setDuration] = useState(1600);
  const [pathArc, setPathArc] = useState(0);
  const [stagger, setStagger] = useState(0);
  const [fontSize, setFontSize] = useState(100);
  const [spacing, setSpacing] = useState(0);
  const [easing, setEasing] = useState<Easing>('smooth');
  const [quality, setQuality] = useState<Quality>('balanced');
  const [loop, setLoop] = useState(true);
  const [outline, setOutline] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [customFont, setCustomFont] = useState<FontHandle>();
  const [fontName, setFontName] = useState('Noto Sans JP · Regular');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const controller = useRef<MorphGlyphHandle>(null);
  const slider = useRef<HTMLInputElement>(null);
  const progressLabel = useRef<HTMLOutputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const onUpdate = useCallback((p: number) => {
    if (slider.current) slider.current.value = String(p);
    if (progressLabel.current) progressLabel.current.textContent = `${Math.round(p * 100)}%`;
  }, []);

  const code = `<MorphGlyph\n  before=${JSON.stringify(before)}\n  after=${JSON.stringify(after)}\n${customFont ? '  font="/fonts/your-font.otf"\n' : ''}  fontSize={${fontSize}}\n  duration={${duration}}\n  easing="${easing}"${pathArc ? `\n  pathArc={${pathArc}}` : ''}${stagger ? `\n  stagger={${stagger}}` : ''}${spacing ? `\n  letterSpacing={${spacing}}` : ''}${quality !== 'balanced' ? `\n  quality="${quality}"` : ''}${loop ? '\n  loop\n  loopDelay={1000}\n  direction="alternate"' : ''}\n/>`;
  const replay = () => {
    controller.current?.restart();
    setPlaying(true);
  };
  const usePreset = (preset: (typeof presets)[number]) => {
    setBefore(preset.before);
    setAfter(preset.after);
    setRestartKey((k) => k + 1);
    setError('');
  };
  const uploadFont = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    try {
      setCustomFont(parseFont(await selected.arrayBuffer(), selected.name));
      setFontName(selected.name);
      setError('');
    } catch {
      setError('This font could not be read. Choose a static TTF or OTF file.');
    }
    event.target.value = '';
  };

  return (
    <>
      <header className="nav">
        <a className="brand" href="#">
          MorphGlyph <span className="version">0.1.0</span>
        </a>
        <nav aria-label="Main">
          <a className="active" href="#playground">
            Playground
          </a>
          <a href="#api">API</a>
          <a className="github" href="https://github.com/aomona/MorphGlyph">
            <Icon name="github" /> GitHub <span>↗</span>
          </a>
        </nav>
      </header>
      <main>
        <h1>Playground</h1>

        <section className="workbench" id="playground" aria-label="MorphGlyph playground">
          <aside className="settings">
            <label className="field">
              Before
              <input
                value={before}
                onChange={(e) => setBefore(e.target.value)}
                maxLength={64}
                spellCheck={false}
              />
            </label>
            <div className="between">
              <Icon name="arrow" />
            </div>
            <label className="field">
              After
              <input
                value={after}
                onChange={(e) => setAfter(e.target.value)}
                maxLength={64}
                spellCheck={false}
              />
            </label>
            <div className="font-field">
              <span className="field-label">Typeface</span>
              <button
                className="font-button"
                onClick={() => file.current?.click()}
                title="Load a local TTF or OTF font"
              >
                <span className="font-sample">Aa</span>
                <span>{fontName}</span>
                <span>↗</span>
              </button>
              <input ref={file} type="file" accept=".ttf,.otf" hidden onChange={uploadFont} />
              {customFont && (
                <button
                  className="text-button"
                  onClick={() => {
                    setCustomFont(undefined);
                    setFontName('Noto Sans JP · Regular');
                  }}
                >
                  Use default font
                </button>
              )}
            </div>
            <div className="section-rule" />
            <Range
              label="Duration"
              value={duration}
              min={200}
              max={4000}
              step={100}
              unit="ms"
              onChange={setDuration}
            />
            <Range
              label="Path arc"
              value={pathArc}
              min={-3.14}
              max={3.14}
              step={0.01}
              unit="rad"
              onChange={setPathArc}
            />
            <Range
              label="Stagger"
              value={stagger}
              min={0}
              max={200}
              step={10}
              unit="ms"
              onChange={setStagger}
            />
            <label className="select-field">
              Easing
              <select
                value={typeof easing === 'string' ? easing : 'smooth'}
                onChange={(e) => setEasing(e.target.value as Easing)}
              >
                <option value="smooth">Smooth</option>
                <option value="linear">Linear</option>
                <option value="smoothstep">Smoothstep</option>
                <option value="smootherstep">Smootherstep</option>
              </select>
            </label>
            <details className="advanced">
              <summary>
                Type & rendering <span>+</span>
              </summary>
              <Range
                label="Font size"
                value={fontSize}
                min={24}
                max={180}
                step={2}
                unit="px"
                onChange={setFontSize}
              />
              <Range
                label="Letter spacing"
                value={spacing}
                min={-5}
                max={20}
                step={1}
                unit="px"
                onChange={setSpacing}
              />
              <label className="select-field">
                Quality
                <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
                  <option value="fast">Fast</option>
                  <option value="balanced">Balanced</option>
                  <option value="high">High</option>
                </select>
              </label>
            </details>
          </aside>

          <div className="canvas-panel">
            <div className="canvas-toolbar">
              <span className="panel-title">Preview</span>
              <div className="switches">
                <label>
                  <input
                    type="checkbox"
                    checked={outline}
                    onChange={(e) => setOutline(e.target.checked)}
                  />
                  Outlines
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={loop}
                    onChange={(e) => setLoop(e.target.checked)}
                  />
                  Loop
                </label>
              </div>
            </div>
            <div className={`stage ${outline ? 'outlines' : ''}`}>
              <div
                className="stage-center"
                onPointerDownCapture={(event) => {
                  if ((event.target as Element).closest('[data-morphglyph-text]')) {
                    controller.current?.pause();
                    setPlaying(false);
                  }
                }}
              >
                <MorphGlyph
                  key={restartKey}
                  ref={controller}
                  before={before}
                  after={after}
                  font={customFont}
                  fontSize={fontSize}
                  letterSpacing={spacing}
                  duration={duration}
                  easing={easing}
                  pathArc={pathArc}
                  stagger={stagger}
                  quality={quality}
                  loop={loop}
                  loopDelay={1000}
                  direction="alternate"
                  onReady={() => {
                    setReady(true);
                    setError('');
                  }}
                  onStart={() => setPlaying(true)}
                  onComplete={() => {
                    setPlaying(
                      loop && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                    );
                  }}
                  onError={(e) => {
                    setError(e.message);
                    setReady(false);
                    setPlaying(false);
                  }}
                  onUpdate={onUpdate}
                />
              </div>
              {!ready && !error && <div className="stage-caption">Loading font…</div>}
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="transport">
              <button
                className="play-button"
                aria-label={playing ? 'Pause' : 'Play'}
                disabled={!ready}
                onClick={() => {
                  if (playing) {
                    controller.current?.pause();
                    setPlaying(false);
                  } else {
                    if (Number(slider.current?.value) >= 1) replay();
                    else {
                      controller.current?.play();
                      setPlaying(true);
                    }
                  }
                }}
              >
                <Icon name={playing ? 'pause' : 'play'} />
                <MorphLabel before="Play" text={playing ? 'Pause' : 'Play'} width={34} />
              </button>
              <button
                className="icon-button"
                aria-label="Replay"
                disabled={!ready}
                onClick={replay}
              >
                <Icon name="reset" />
              </button>
              <button
                className="icon-button"
                aria-label="Reverse"
                disabled={!ready}
                onClick={() => {
                  controller.current?.reverse();
                  setPlaying(true);
                }}
              >
                <Icon name="reverse" />
              </button>
              <input
                ref={slider}
                className="timeline"
                aria-label="Progress"
                type="range"
                min={0}
                max={1}
                step={0.001}
                defaultValue={0}
                disabled={!ready}
                onChange={(e) => {
                  controller.current?.pause();
                  controller.current?.seek(Number(e.target.value));
                  setPlaying(false);
                }}
              />
              <output ref={progressLabel} className="progress-value" aria-live="off">
                0%
              </output>
            </div>
            <div className="presets">
              <span>Examples</span>
              {presets.map((p) => (
                <button
                  key={p.label}
                  className={p.before === before && p.after === after ? 'selected' : ''}
                  onClick={() => usePreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="code-section" aria-label="Usage example">
          <h2>Usage</h2>
          <div className="code-window">
            <div className="code-heading">
              <span>
                <span className="code-dot" /> YourComponent.tsx
              </span>
              <button
                aria-label={copied ? 'Copied' : 'Copy code'}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `import { MorphGlyph } from 'morphglyph';\n\n${code}`,
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    setError('Clipboard unavailable. Select and copy the code below.');
                  }
                }}
              >
                <Icon name="copy" />
                <MorphLabel
                  before="Copy code"
                  text={copied ? 'Copied' : 'Copy code'}
                  width={58}
                  size={11}
                />
              </button>
            </div>
            <pre>
              <code>
                <span className="code-import">import</span>
                {` { MorphGlyph } `}
                <span className="code-import">from</span>
                {` 'morphglyph';\n\n`}
                {code}
              </code>
            </pre>
          </div>
        </section>

        <section className="api-section" id="api">
          <h2>API</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Prop</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['before / after', 'required', 'Source and target text.'],
                  ['font', 'Noto Sans JP', 'A static TTF / OTF URL or a loaded font.'],
                  ['duration', '1000', 'Total duration in milliseconds.'],
                  ['pathArc', '0', 'Curved motion, in radians.'],
                  ['stagger', '0', 'Delay between glyphs, in milliseconds.'],
                  ['progress', '—', 'Control the frame directly, from 0 to 1.'],
                ].map(([prop, initial, description]) => (
                  <tr key={prop}>
                    <td>
                      <code>{prop}</code>
                    </td>
                    <td>{initial}</td>
                    <td>{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <a className="docs-link" href="https://github.com/aomona/MorphGlyph#api">
            Full API reference ↗
          </a>
        </section>
      </main>
      <footer>
        <span>
          Inspired by <a href="https://www.manim.community/">Manim</a>
        </span>
        <a href="https://github.com/aomona/MorphGlyph/blob/main/LICENSE">MIT License</a>
      </footer>
    </>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-field">
      <span>
        {label}
        <output>
          {value} <span>{unit}</span>
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
