'use strict';
import path from 'path'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'
import workerLoader from 'rollup-plugin-web-worker-loader'
import pkg from './package.json' with { type: 'json' }
import { babel } from '@rollup/plugin-babel'
import terser from '@rollup/plugin-terser'
import { DEFAULT_EXTENSIONS } from '@babel/core'
import { base64 } from '@picovoice/web-utils/plugins/index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensions = [...DEFAULT_EXTENSIONS, '.ts'];

console.log(process.env.TARGET);
console.log(extensions);

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const iifeBundleName = pkg.name
  .split('@picovoice/')[1]
  .split('-')
  .map(word => capitalizeFirstLetter(word))
  .join('');
console.log(iifeBundleName);

export default {
  input: [path.resolve(__dirname, pkg.entry)],
  output: [
    {
      file: path.resolve(__dirname, pkg['module']),
      format: 'esm',
      sourcemap: false,
    },
    {
      file: path.resolve(__dirname, 'dist', 'esm', 'index.min.js'),
      format: 'esm',
      sourcemap: false,
      plugins: [terser()],
    },
    {
      file: path.resolve(__dirname, pkg.iife),
      format: 'iife',
      name: iifeBundleName,
      sourcemap: false,
    },
    {
      file: path.resolve(__dirname, 'dist', 'iife', 'index.min.js'),
      format: 'iife',
      name: iifeBundleName,
      sourcemap: false,
      plugins: [terser()],
    },
  ],
  plugins: [
    nodeResolve({ extensions }),
    commonjs(),
    workerLoader({ targetPlatform: 'browser', sourcemap: false }),
    typescript({
      cacheRoot: path.resolve(__dirname, '.rts2_cache'),
      clean: true,
    }),
    babel({
      extensions: extensions,
      babelHelpers: 'runtime',
      exclude: '**/node_modules/**',
    }),
    base64({
      include: ['./**/*.wasm', './**/*.txt'],
    })
  ],
};
