import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const isProduction = process.env.NODE_ENV === 'production';

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
    }
  }),
  babel({
    babelHelpers: 'bundled',
    presets: [
      ['@babel/preset-env', {
        targets: target === 'node' ? { node: '12.0.0' } : {
          browsers: ['> 0.5%', 'last 2 versions', 'not dead']
        },
        modules: target === 'esm' ? false : 'auto',
        loose: true,
        bugfixes: true
      }]
    ],
    comments: false,
    compact: true
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
    ecma: 2020
  })
].filter(Boolean);

export default [
  // ==================== ЯДРО (CORE) ====================
  // UMD ядро
  {
    input: 'src/browser/core.ts',
    output: {
      file: 'dist/jtcsv-core.umd.js',
      format: 'umd',
      name: 'jtcsv',
      sourcemap: !isProduction,
      globals: {},
      exports: 'named'
    },
    plugins: basePlugins('browser')
  },
  // ESM ядро
  {
    input: 'src/browser/core.ts',
    output: {
      file: 'dist/jtcsv-core.esm.js',
      format: 'es',
      sourcemap: !isProduction,
      exports: 'named'
    },
    plugins: basePlugins('esm')
  },
  // CJS ядро
  {
    input: 'src/browser/core.ts',
    output: {
      file: 'dist/jtcsv-core.cjs.js',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'named'
    },
    plugins: basePlugins('node')
  },

  // ==================== ПОЛНАЯ ВЕРСИЯ (FULL) ====================
  // UMD полная
  {
    input: 'src/browser/index.ts',
    output: {
      file: 'dist/jtcsv-full.umd.js',
      format: 'umd',
      name: 'jtcsv',
      sourcemap: !isProduction,
      globals: {},
      exports: 'named'
    },
    plugins: basePlugins('browser')
  },
  // ESM полная
  {
    input: 'src/browser/index.ts',
    output: {
      file: 'dist/jtcsv-full.esm.js',
      format: 'es',
      sourcemap: !isProduction,
      exports: 'named'
    },
    plugins: basePlugins('esm')
  },
  // CJS полная
  {
    input: 'src/browser/index.ts',
    output: {
      file: 'dist/jtcsv-full.cjs.js',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'named'
    },
    plugins: basePlugins('node')
  },

  // ==================== РАСШИРЕНИЯ ====================
  // Web Workers расширение
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
      file: 'dist/jtcsv-workers.esm.js',
      format: 'es',
      sourcemap: !isProduction,
      exports: 'named'
    },
    plugins: basePlugins('esm')
  }
];
