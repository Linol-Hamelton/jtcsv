import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

export default [
  // UMD версия для браузера (глобальная переменная jtcsv)
  {
    input: 'src/browser/index.js',
    output: {
      file: 'dist/jtcsv.umd.js',
      format: 'umd',
      name: 'jtcsv',
      sourcemap: !isProduction,
      globals: {}
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        presets: [
          ['@babel/preset-env', {
            targets: {
              browsers: ['> 0.5%', 'last 2 versions', 'not dead']
            }
          }]
        ]
      }),
      isProduction && terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        output: {
          comments: false
        }
      })
    ].filter(Boolean)
  },

  // ESM версия для современных бандлеров
  {
    input: 'src/browser/index.js',
    output: {
      file: 'dist/jtcsv.esm.js',
      format: 'es',
      sourcemap: !isProduction
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        presets: [
          ['@babel/preset-env', {
            targets: {
              browsers: ['> 0.5%', 'last 2 versions', 'not dead']
            },
            modules: false
          }]
        ]
      }),
      isProduction && terser({
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        output: {
          comments: false
        }
      })
    ].filter(Boolean)
  },

  // CJS версия для Node.js (совместимость)
  {
    input: 'src/browser/index.js',
    output: {
      file: 'dist/jtcsv.cjs.js',
      format: 'cjs',
      sourcemap: !isProduction,
      exports: 'named'
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        presets: [
          ['@babel/preset-env', {
            targets: {
              node: '12.0.0'
            }
          }]
        ]
      })
    ].filter(Boolean)
  }
];