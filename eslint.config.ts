import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser,
        ...globals.worker,
        define: 'readonly',
        self: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'indent': ['error', 2],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'space-infix-ops': 'error',
      'arrow-spacing': 'error',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'no-case-declarations': 'off'
    }
  },
  // Test files
  {
    files: ['**/__tests__/**/*.js', '**/*.test.js'],
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off'
    }
  },
  // Examples and benchmarks
  {
    files: ['**/examples/**/*.js', 'benchmark.js', 'test-*.js'],
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }]
    }
  },
  // CLI binaries
  {
    files: ['bin/**/*.js'],
    rules: {
      'no-console': 'off'
    }
  },
  // Browser code (ESM modules) - TypeScript files
  {
    files: ['src/browser/**/*.ts', 'src/browser/workers/**/*.ts'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.worker,
        document: 'readonly',
        window: 'readonly',
        FileReader: 'readonly',
        Worker: 'readonly',
        self: 'readonly',
        define: 'readonly'
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }]
    }
  },
  // ES Module files (.mjs and demo/plugins files)
  {
    files: ['**/*.mjs', 'demo/**/*.js', 'plugins/**/*.js', 'rollup.config.mjs'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }]
    }
  },
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'demo/node_modules/**',
      'plugins/**/node_modules/**',
      'packages/**/node_modules/**',
      'docs/api/**'  // Generated documentation files
    ]
  }
];
