# MorphGlyph 実装計画

2026-09-10 / 計画のみ。実装は未着手。

## 目的

`<MorphGlyph before="before" after="after" />` で文字アウトラインそのものが変形する React ライブラリを作る。参照会話の日本語デモを出発点に、Transform を主機能として設計し直す。React の画面コードと幾何計算を分離する。

Manim の Transform に着想を得るが、Manim と同一の対応付け・描画結果を保証する API にはしない。TransformMatchingShapes は初版に含めない。

## 利用 API 案

```tsx
import { MorphGlyph } from 'morphglyph';

<MorphGlyph before="before" after="after" />

<MorphGlyph
  before="こんにちは"
  after="MorphGlyph"
  font="/fonts/NotoSansJP-Regular.ttf"
  fontSize={72}
  duration={1200}
  easing="smooth"
  pathArc={Math.PI / 4}
  stagger={40}
  align="center"
  className="title"
  style={{ color: '#6366f1' }}
/>

// スライダー、スクロール、外部タイムラインから制御
<MorphGlyph before="図形" after="文字" progress={progress} />
```

`morphglyph` は import 名の案。npm 上の取得可否は公開準備時に確認する。

| props | 初期値 / 契約 |
| --- | --- |
| `before`, `after` | 必須の文字列。空文字も有効 |
| `font` | フォント URL またはライブラリの読み込み済み FontHandle。省略時は同梱の日本語対応フォント |
| `fontSize` | `64`、SVG 座標上の px |
| `letterSpacing` | `0`、px。末尾への余分な加算なし |
| `align` | `"center"`。`"left" / "center" / "right"` |
| `duration` | `1000` ms。stagger を含む一方向の再生時間 |
| `delay` | `0` ms。初回または明示的 restart 時の待ち時間 |
| `easing` | `"smooth"`。`"linear" / "smoothstep" / "smootherstep"` または `(t: number) => number` |
| `pathArc` | `0` rad。対応点の移動軌道を円弧化 |
| `stagger` | `0` ms。グリフごとの開始時間差。総遅延が duration を超える値は縮める |
| `playing` | `true`。false で現在位置に一時停止 |
| `loop` | `false`。true で継続再生 |
| `direction` | `"normal"`。`"reverse" / "alternate"` も提供 |
| `progress` | 未指定。指定時は 0〜1 の制御モード |
| `quality` | `"balanced"`。`"fast" / "balanced" / "high"`、幾何精度と点数上限のプリセット |
| `reducedMotion` | `"system"`。`"always" / "never"` も提供 |
| `fallback` | 未指定なら通常テキスト。任意の ReactNode で置換可能 |
| `onReady`, `onStart`, `onComplete`, `onError` | 状態遷移・読み込み失敗の通知 |
| `className`, `style`, `id`, `aria-label` | ルート要素に適用。塗り色は `currentColor` |

型は自動再生モードと progress 制御モードの判別可能な union にし、progress と playing / loop / direction / delay / duration / stagger の同時指定を禁止する。制御モードの progress はイージング適用前の進捗で、0 と 1 は必ずそれぞれの端点になる。初版では制御モードの stagger を省き、スクラブの意味を単純に保つ。

ref は `play()`, `pause()`, `restart()`, `reverse()` を提供する。これらは非制御モード用で、明示された playing props が優先。制御モードでは progress の変更を唯一の操作方法にする。onComplete は自動再生の終端到達で発火し、ループ時は各一方向区間の終端で一度だけ発火。progress の外部変更からは onStart / onComplete を発火させない。

## 既定動作と更新契約

- マウント時は before を表示し、フォントと変形計画の準備後に一度再生。終了後は after を保持。
- 同じ props で再レンダーしても再生し直さない。
- after のみ変更されたら、現在表示中の幾何形状を始点として新しい after に移行。位置の連続性を保証対象とし、速度の連続性は初版の対象外。
- before が変更されたら新しい変形ペアとしてリセットする。同時に after が変わってもこの規則を優先。
- フォント変更時は現在の描画を保持して読み込み、新しいフォントの before から再構築する。フォント変更をまたぐ連続モーフは後続機能。
- progress 制御モードは常に指定された before / after から決定的に計算し、内部時計を動かさない。
- `duration={0}` は即時に終端へ到達。空文字同士は空のレイアウトとして安全に完了する。
- 古いフォント読み込み・変形準備の結果は世代番号で破棄し、最新 props を上書きさせない。

## Transform エンジン

1. **文字列からグリフ列へ**：opentype.js を最初のフォントアダプター候補にする。advance、kerning、空白の幅、元文字列との対応を保持する。まず横書き一行の日英混在を対象にする。
2. **アウトライン正規化**：直線・二次・三次ベジェを共通の三次ベジェ表現に変換。解析用のサンプル点と描画用の曲線を分け、表示の端点で輪郭が粗くならないようにする。
3. **グリフ対応付け**：初版は表示順の index 対応。例えば ABC → XY は A → X、B → Y、C → 縮退。逆方向の不足分は局所的な縮退形状から成長。空白は位置計算に参加し、輪郭のあるグリフの対応付けからは除外する。
4. **輪郭対応付け**：外周・穴・入れ子構造を解析し、同じ役割を優先して面積・重心・包含関係で組み合わせる。単純な面積順の組み合わせだけにはしない。不足する穴は対応する外周の内部に縮退点を置く。
5. **点数と開始点の整列**：ベジェ分割で対応するセグメント数を揃える。閉曲線の開始点を巡回させて変形量を抑える。外周と穴の winding の関係を保ち、変形距離を減らすためだけの自由な反転は行わない。
6. **補間**：固定した対応点間を線形または pathArc の円弧で補間。arc がゼロに近い場合や特異値は安定した処理へ分岐する。最初と最後は正確な元アウトラインを保持する。
7. **描画**：グリフ単位の SVG path と nonzero fill を基本にする。文字同士を一つの巨大な compound path に結合しない。

参照会話の evenodd 問題は fillRule の変更だけで完了としない。輪郭の役割・向きと実際の中間フレームを検証する。任意の異なるトポロジー間で自己交差を完全に防ぐことは初版の保証対象外。

## フォント・表示・配布

- 引数二つだけの例が実動するよう、日本語対応の既定フォントを npm パッケージの別アセットとして提供する。JS への埋め込みはしない。候補は静的な Noto Sans JP Regular。フォントファイルと付属ライセンスを固定する。
- Google Fonts の CSS やブラウザの font-family だけからアウトラインを取り出す設計にはしない。URL で生のフォントデータを取得する。
- 初版の保証形式は静的 TTF / OTF。WOFF2、可変軸、カラーフォント、複雑な書記体系は別途検証後に広げる。
- `loadFont()` と `MorphGlyphProvider` によって複数コンポーネントの読み込みを共有。フォント・グリフ・変形計画のキャッシュは上限を持つ。
- 最初の技術検証で Vite / Next.js の既定フォントアセット解決を確認する。ここが成立するまでは最小 API を完成扱いにしない。
- 欠落グリフはエラー通知と通常テキスト fallback に切り替える。暗黙に豆腐グリフへ変形しない。
- 全角・半角空白と句読点を検証する。初版は一行と明記し、改行はスペースに正規化する。絵文字・複雑な結合文字は対応を保証せず、欠落や非対応時の fallback を定義する。
- 表示領域は before / after の幅、フォントメトリクス、円弧移動の範囲を考慮して確保する。フレームごとに viewBox を再計算して文字全体が伸縮する動作を避ける。
- SSR と hydration の最初の描画は同じ通常テキストにする。クライアントで準備後に SVG を表示。フォント未取得時の寸法差は明示的な width / height の指定で抑えられるようにする。
- SVG は読み上げから隠し、before / after の意味上のテキストを別途提供する。自動の aria-live は使わない。aria-label があれば優先する。
- reduced motion では大きな形状変形・円弧移動・自動ループを止め、短いフェードまたは静的表示に置換。制御モードでは progress の端点側の文字を静的表示する。

## 構成案

```text
packages/morphglyph/
  src/core/       # geometry, layout, pairing, plan, interpolation
  src/fonts/      # adapter, loader, bounded cache
  src/react/      # MorphGlyph, provider, playback hooks
  assets/        # default font and license
  tests/
examples/playground/
docs/
```

TypeScript、pnpm workspace、ESM と型定義を基本とする。React は peer dependency とし、React 18 / 19 を検証対象にする。core は DOM / React に依存させず、内部 API として開始。Motion / GSAP を必須依存にせず、外部連携は progress で実現する。

通常再生では requestAnimationFrame から専用レンダラーが path を更新し、React state を毎フレーム更新しない。React と専用レンダラーが同じ属性を競合して書き換えない所有範囲を定義する。アンマウント・再マウント・StrictMode で時計とイベントを確実に破棄する。

## 実装順序と完了条件

1. **技術検証**：既定フォントで before → after、日 → 田、あ → 漢、ABC → XY を固定 progress で描画。ベジェ整列、穴、文字数差、既定フォントの二つの利用環境での配布を先に確かめる。
2. **core**：上記パイプラインを純粋関数へ分離。端点一致、有限座標、決定性、空文字、退化輪郭、円弧の境界値をテストする。
3. **React API**：最小コンポーネント、読み込み、再生、制御 progress、更新契約、ref、エラーと SSR を実装。高速な after 更新、StrictMode、アンマウントを検証する。
4. **品質と操作デモ**：文字・フォント・時間・円弧・stagger・quality の変更、再生・停止・反転・スクラブ、コード例コピーを提供。輪郭・対応線表示はデモのデバッグ機能に限定する。
5. **配布検証**：型チェック、core テスト、Playwright、npm pack で得たパッケージを新規 Vite / Next.js へ導入。フォントアセット、型解決、SSR、production build を確認する。README・API 一覧・制限・ライセンス・由来表記を整える。

視覚検証は A/O/B/8、日/田/回、濁点、句読点、同一文字の繰り返し、空白、空文字、長短の組み合わせを含め、progress 0 / .25 / .5 / .75 / 1 と連続再生を確認する。通常表示と reduced-motion の両方を検証する。

性能は英数字 20 文字、日本語 20 文字、同時 10 インスタンスで準備時間・フレーム時間・点数・メモリを記録する。対象ブラウザと端末を明記し、balanced で 60fps を目標とするが、計測前に保証しない。ボトルネックが判明した場合に Worker 化やさらなる点数制限を検討する。

## 後続機能

TransformMatchingShapes、文字対応の手動指定、複数行・縦書き、before/after 別フォントと別色、可変フォント軸、複雑な shaping、Worker、headless core の公開。まず Transform の視覚品質と React ライフサイクルを完成させる。

## 参照

- 参照会話: ReactでManim文字変形デモ作成 / 6aa21a5f-172c-83ee-9cee-a0221aefbab4。API で取得できたコードは一部が切り詰められているため、既存コード全体を監査済みとは扱わない。
- https://docs.manim.community/en/stable/reference/manim.animation.transform.Transform.html
- https://docs.manim.community/en/stable/_modules/manim/animation/transform.html
- https://github.com/opentypejs/opentype.js
