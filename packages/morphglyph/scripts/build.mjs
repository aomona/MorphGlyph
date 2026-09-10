import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { rm, copyFile, readFile, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'opentype.js', './default-data.js'],
  banner: { js: '"use client";' },
});
// A separate data module works in both Vite's dependency optimizer and Next.js,
// without requiring consumers to configure a font-asset loader. Never inline it
// into the main entry; production bundlers retain the dynamic import boundary.
const font = await readFile('assets/NotoSansJP-Regular.otf');
await writeFile(
  'dist/default-data.js',
  `export default ${JSON.stringify(font.toString('base64'))};\n`,
);
execFileSync('tsc', ['-p', 'tsconfig.build.json'], { stdio: 'inherit' });
await copyFile('../../LICENSE', 'LICENSE');
await copyFile('../../README.md', 'README.md');
