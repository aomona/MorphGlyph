import { useEffect, useState, type ReactNode } from 'react';
import { MorphGlyph } from 'morphglyph';
import './examples.css';

function Example({
  title,
  children,
  code,
  dark = false,
}: {
  title: string;
  children: ReactNode;
  code: string;
  dark?: boolean;
}) {
  return (
    <article className={`example${dark ? ' example-dark' : ''}`} aria-label={title}>
      <h3>{title}</h3>
      {children}
      <details className="example-code">
        <summary>Code</summary>
        <pre>
          <code>{code}</code>
        </pre>
      </details>
    </article>
  );
}

function Text({
  before,
  after,
  arc = 0,
  stagger = 0,
}: {
  before: string;
  after: string;
  arc?: number;
  stagger?: number;
}) {
  return (
    <div className="example-display">
      <MorphGlyph
        before={before}
        after={after}
        fontSize={48}
        duration={650}
        pathArc={arc}
        stagger={stagger}
        width="100%"
        height={110}
        style={{ width: '100%' }}
      />
    </div>
  );
}

function Counter() {
  const [count, setCount] = useState(128);
  return (
    <Example
      title="Counter"
      code={`const [count, setCount] = useState(128);

<MorphGlyph before="128" after={String(count)} />
<button onClick={() => setCount(n => n + 1)}>+</button>`}
    >
      <Text before="128" after={String(count)} />
      <div className="example-controls">
        <button aria-label="Decrease count" onClick={() => setCount((n) => n - 1)}>
          −
        </button>
        <button aria-label="Increase count" onClick={() => setCount((n) => n + 1)}>
          +
        </button>
      </div>
    </Example>
  );
}

function Countdown() {
  const [step, setStep] = useState(3);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    if (step === 0) {
      setRunning(false);
      return;
    }
    const timer = setTimeout(() => setStep((n) => n - 1), 1100);
    return () => clearTimeout(timer);
  }, [running, step]);
  return (
    <Example
      title="Countdown"
      dark
      code={`const [step, setStep] = useState(3);

useEffect(() => {
  if (step === 0) return;
  const timer = setTimeout(() => setStep(n => n - 1), 1100);
  return () => clearTimeout(timer);
}, [step]);

<MorphGlyph before="3" after={step ? String(step) : 'GO'} />`}
    >
      <Text before="3" after={step ? String(step) : 'GO'} />
      <div className="example-controls">
        <button
          disabled={running}
          onClick={() => {
            setStep(3);
            setRunning(true);
          }}
        >
          Start
        </button>
      </div>
    </Example>
  );
}

function Playback() {
  const [playing, setPlaying] = useState(false);
  return (
    <Example
      title="Playback"
      code={`const [playing, setPlaying] = useState(false);

<button aria-label={playing ? 'Pause' : 'Play'}
  onClick={() => setPlaying(value => !value)}>
  <span aria-hidden="true">
    <MorphGlyph before="PLAY" after={playing ? 'PAUSE' : 'PLAY'}
      selectable={false} />
  </span>
</button>`}
    >
      <button
        className="example-playback"
        aria-label={playing ? 'Pause demo' : 'Play demo'}
        onClick={() => setPlaying((value) => !value)}
      >
        <span aria-hidden="true">
          <MorphGlyph
            before="PLAY"
            after={playing ? 'PAUSE' : 'PLAY'}
            selectable={false}
            fontSize={48}
            duration={450}
            width="100%"
            height={110}
            style={{ width: '100%' }}
          />
        </span>
      </button>
      <div className="example-controls">
        <span className="example-hint">Click the text</span>
      </div>
    </Example>
  );
}

function Languages() {
  const [language, setLanguage] = useState('EN');
  const words: Record<string, string> = { EN: 'Hello', JP: 'こんにちは', FR: 'Bonjour' };
  return (
    <Example
      title="Languages"
      code={`const words = { EN: 'Hello', JP: 'こんにちは', FR: 'Bonjour' };
const [language, setLanguage] = useState('EN');

<MorphGlyph before="Hello" after={words[language]} stagger={45} />`}
    >
      <Text before="Hello" after={words[language]} stagger={45} />
      <div className="example-controls">
        {Object.keys(words).map((value) => (
          <button key={value} aria-pressed={language === value} onClick={() => setLanguage(value)}>
            {value}
          </button>
        ))}
      </div>
    </Example>
  );
}

function Equation() {
  const [factored, setFactored] = useState(false);
  return (
    <Example
      title="Factorization"
      code={`const [factored, setFactored] = useState(false);

<MorphGlyph before="x² + 2x + 1"
  after={factored ? '(x + 1)²' : 'x² + 2x + 1'}
  pathArc={0.8} />`}
    >
      <Text before="x² + 2x + 1" after={factored ? '(x + 1)²' : 'x² + 2x + 1'} arc={0.8} />
      <div className="example-controls">
        <button onClick={() => setFactored((value) => !value)}>
          {factored ? 'Expand' : 'Factor'}
        </button>
      </div>
    </Example>
  );
}

function SaveState() {
  const [status, setStatus] = useState('保存する');
  useEffect(() => {
    if (status !== '保存中') return;
    const timer = setTimeout(() => setStatus('保存済み'), 1600);
    return () => clearTimeout(timer);
  }, [status]);
  return (
    <Example
      title="Save state"
      code={`const [status, setStatus] = useState('保存する');

<MorphGlyph before="保存する" after={status} />
// Set status to 保存中 while saving, then 保存済み.`}
    >
      <Text before="保存する" after={status} />
      <div className="example-controls">
        <button
          disabled={status === '保存中'}
          onClick={() => setStatus(status === '保存済み' ? '保存する' : '保存中')}
        >
          {status === '保存済み' ? 'Reset' : 'Save'}
        </button>
      </div>
    </Example>
  );
}

function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <Example
      title="Pricing"
      code={`const [yearly, setYearly] = useState(false);

<MorphGlyph before="$19" after={yearly ? '$190' : '$19'} />`}
    >
      <Text before="$19" after={yearly ? '$190' : '$19'} />
      <div className="example-controls">
        <button aria-pressed={!yearly} onClick={() => setYearly(false)}>
          Monthly
        </button>
        <button aria-pressed={yearly} onClick={() => setYearly(true)}>
          Yearly
        </button>
      </div>
    </Example>
  );
}

function Typography() {
  const [shape, setShape] = useState(false);
  return (
    <Example
      title="Typography"
      dark
      code={`const [shape, setShape] = useState(false);

<MorphGlyph before="文字" after={shape ? 'かたち' : '文字'}
  pathArc={1.2} stagger={100} />`}
    >
      <Text before="文字" after={shape ? 'かたち' : '文字'} arc={1.2} stagger={100} />
      <div className="example-controls">
        <button onClick={() => setShape((value) => !value)}>Transform</button>
      </div>
    </Example>
  );
}

export function Examples() {
  return (
    <section className="examples-section" aria-labelledby="examples-title">
      <h2 id="examples-title">Examples</h2>
      <div className="examples-grid">
        <Counter />
        <Countdown />
        <Playback />
        <Languages />
        <Equation />
        <SaveState />
        <Pricing />
        <Typography />
      </div>
    </section>
  );
}
