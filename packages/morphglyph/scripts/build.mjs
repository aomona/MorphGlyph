import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { rm, copyFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/index.ts'], outdir: 'dist', bundle: true,
  format: 'esm', platform: 'neutral', target: 'es2022',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'opentype.js'],
  banner: { js: '"use client";' },
});
execFileSync('tsc', ['-p', 'tsconfig.build.json'], { stdio: 'inherit' });
await copyFile('../../LICENSE', 'LICENSE');
await copyFile('../../README.md', 'README.md');
