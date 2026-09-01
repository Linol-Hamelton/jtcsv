import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const isProduction = process.env.NODE_ENV === 'production';

// engines.node >=18.17 + browserslist "supports es6-module" → TS target ES2022
// is good enough; no Babel transpile needed. Removes ~30 babel devDeps.
// `target` arg kept only to switch resolve.browser flag.
const basePlugins = (target = 'browser') => [
  resolve({
    browser: target === 'browser',
    preferBuiltins: false,
    modulesOnly: true,
    extensions: ['.ts', '.js']
  }),
  commonjs({
    ignoreDynamicRequires: true,
    requireReturnsDefault: 'auto'
  }),
  typescript({
    tsconfig: './tsconfig.rollup.json',
    compilerOptions: {
      sourceMap: !isProduction
    },
    // Don't typecheck sub-packages and example-only sources during the
    // main bundle build — they're built (or not) by their own
    // toolchains and pull peer-deps that aren't in the root install.
    exclude: ['plugins/**', 'examples/**', 'packages/**', '**/__tests__/**'],
  }),
  isProduction && terser({
    compress: {
      drop_console: true,
      drop_debugger: true,
      passes: 5,
      pure_funcs: ['console.log', 'console.debug', 'console.info', 'console.warn'],
      dead_code: true,
      unsafe: true,
      unsafe_math: true,
      unsafe_methods: true,
      unsafe_proto: true,
      unsafe_regexp: true
    },
    mangle: {
      properties: {
        regex: /^_/,
        reserved: ['jtcsv', 'ValidationError', 'SecurityError', 'FileSystemError', 'ParsingError', 'LimitError', 'ConfigurationError']
      }
    },
    output: {
      comments: false,
      beautify: false
    },
    ecma: 2022
  })
].filter(Boolean);

export default [
  // ==================== BROWSER BUNDLE (./browser export) ====================
  // ==================== Р‘Р РђРЈР—Р•Р РќР«Р™ Р‘РђРќР”Р› (COMPAT) ====================
  // UMD
  {
    input: 'src/browser/index.ts',
    output: {
      file: 'dist/jtcsv.umd.js',
      format: 'umd',
      name: 'jtcsv',
      sourcemap: !isProduction,
      globals: {},
      exports: 'named'
    },
    plugins: basePlugins('browser')
  },
  // ESM
  {
    input: 'src/browser/index.ts',
    output: {
      file: 'dist/jtcsv.mjs',
      format: 'es',
      sourcemap: !isProduction,
      exports: 'named'
    },
    plugins: basePlugins('esm')
  },
  // CJS
  {
    input: 'src/browser/index.ts',
    output: {
      file: 'dist/jtcsv.cjs.js',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'named'
    },
    plugins: basePlugins('node')
  },

  // ==================== WEB WORKERS EXTENSION ====================
  {
    input: 'src/browser/extensions/workers.ts',
    output: {
      file: 'dist/jtcsv-workers.umd.js',
      format: 'umd',
      name: 'jtcsvWorkers',
      sourcemap: !isProduction,
      globals: {},
      exports: 'named'
    },
    plugins: basePlugins('browser')
  },
  {
    input: 'src/browser/extensions/workers.ts',
    output: {
      file: 'dist/jtcsv-workers.mjs',
      format: 'es',
      sourcemap: !isProduction,
      exports: 'named'
    },
    plugins: basePlugins('esm')
  },

  // ==================== CLI ====================
  // bin/jtcsv.ts → dist/bin/jtcsv.js (used by package.json#bin)
  // Note: shebang already at bin/jtcsv.ts:1; rollup preserves it.
  {
    input: 'bin/jtcsv.ts',
    output: {
      file: 'dist/bin/jtcsv.js',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'named'
    },
    external: ['fs', 'fs/promises', 'path', 'readline', 'stream', 'stream/promises', 'os', 'crypto', 'url', 'util', 'events', 'http', 'https', 'worker_threads'],
    plugins: basePlugins('node')
  },

  // ==================== NODE ENTRY POINTS ====================
  // index.ts → dist/index.cjs.js + dist/index.mjs (full Node API: file IO, streams, NDJSON, TSV)
  // Used by: require('jtcsv') / import 'jtcsv' on Node side.
  {
    input: 'index.ts',
    output: [
      {
        file: 'dist/index.cjs.js',
        format: 'cjs',
        sourcemap: !isProduction,
        exports: 'named'
      },
      {
        file: 'dist/index.mjs',
        format: 'es',
        sourcemap: !isProduction,
        exports: 'named'
      }
    ],
    external: ['fs', 'fs/promises', 'path', 'stream', 'stream/promises', 'os', 'crypto', 'url', 'util', 'events', 'worker_threads'],
    plugins: basePlugins('node')
  },

  // src/index-with-plugins.ts → dist/plugins.{cjs,esm}.js
  {
    input: 'src/index-with-plugins.ts',
    output: [
      {
        file: 'dist/plugins.cjs.js',
        format: 'cjs',
        sourcemap: !isProduction,
        exports: 'named'
      },
      {
        file: 'dist/plugins.mjs',
        format: 'es',
        sourcemap: !isProduction,
        exports: 'named'
      }
    ],
    external: ['fs', 'fs/promises', 'path', 'stream', 'stream/promises', 'os', 'crypto', 'url', 'util', 'events', 'worker_threads'],
    plugins: basePlugins('node')
  },

  // src/workers/parser-worker.ts → dist/_worker.cjs.js
  // Loaded by parallelize.ts into a worker_threads.Worker. CJS-only
  // because Node's worker_threads.Worker accepts a path to a CJS/ESM file.
  {
    input: 'src/workers/parser-worker.ts',
    output: {
      file: 'dist/_worker.cjs.js',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'named'
    },
    external: ['fs', 'fs/promises', 'path', 'stream', 'stream/promises', 'os', 'crypto', 'url', 'util', 'events', 'worker_threads'],
    plugins: basePlugins('node')
  },

  // src/utils/schema-validator.ts → dist/schema.{cjs,esm}.js
  {
    input: 'src/utils/schema-validator.ts',
    output: [
      {
        file: 'dist/schema.cjs.js',
        format: 'cjs',
        sourcemap: !isProduction,
        exports: 'named'
      },
      {
        file: 'dist/schema.mjs',
        format: 'es',
        sourcemap: !isProduction,
        exports: 'named'
      }
    ],
    external: ['fs', 'fs/promises', 'path'],
    plugins: basePlugins('node')
  },

  // ==================== SUBPATH EXPORTS ====================
  // jtcsv/csv, jtcsv/json, jtcsv/streams, jtcsv/ndjson, jtcsv/tsv, jtcsv/errors
  // Multi-entry config so rollup deduplicates shared code into _shared/*.
  // Each entry is a thin barrel — users pay only for what they import.
  {
    input: {
      csv:     'src/entry-csv.ts',
      json:    'src/entry-json.ts',
      streams: 'src/entry-streams.ts',
      ndjson:  'src/entry-ndjson.ts',
      tsv:     'src/entry-tsv.ts',
      errors:  'src/entry-errors.ts',
    },
    output: [
      {
        dir: 'dist',
        format: 'es',
        entryFileNames: '[name].mjs',
        chunkFileNames: '_shared/[name]-[hash].mjs',
        sourcemap: !isProduction,
        exports: 'named'
      },
      {
        dir: 'dist',
        format: 'cjs',
        entryFileNames: '[name].cjs.js',
        chunkFileNames: '_shared/[name]-[hash].cjs.js',
        sourcemap: !isProduction,
        exports: 'named'
      }
    ],
    external: ['fs', 'fs/promises', 'path', 'stream', 'stream/promises', 'os', 'crypto', 'url', 'util', 'events', 'worker_threads'],
    plugins: basePlugins('node')
  }
];
