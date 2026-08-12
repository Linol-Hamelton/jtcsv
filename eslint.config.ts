import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
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
  // TypeScript source files
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      parser: tseslint.parser,
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.worker,
        define: 'readonly',
        self: 'readonly'
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
      '@typescript-eslint/no-explicit-any': 'off',
      'indent': 'off',
      '@typescript-eslint/no-require-imports': 'warn',
      'prefer-const': 'warn',
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  // Root TypeScript core files
  {
    files: ['index.ts', 'json-to-csv.ts', 'csv-to-json.ts', 'errors.ts', 'stream-json-to-csv.ts', 'stream-csv-to-json.ts', 'json-save.ts'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      parser: tseslint.parser,
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'log'] }],
      '@typescript-eslint/no-explicit-any': 'off',
      'indent': 'off',
      '@typescript-eslint/no-require-imports': 'warn',
      'prefer-const': 'warn',
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-vars': 'off'
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
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  {
    // Declaration files describe signatures, they do not implement them.
    // TypeScript requires every parameter to be named even though nothing reads
    // it, so `no-unused-vars` flags every single one — 496 findings that are
    // all false positives. The names are the documentation.
    files: ['**/*.d.ts'],
    rules: {
      'no-unused-vars': 'off'
    }
  },
  // Ignore patterns
  {
    // Build output only. Without these, `npm run lint:all` reported ~40k
    // problems, 87 % of them inside the built VitePress site, the generated
    // TypeDoc bundle and the emitted .d.ts tree — noise that buried the few
    // hundred findings in actual source.
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'dist-types/**',              // tsc-emitted declarations
      'demo/node_modules/**',
      'demo/dist/**',
      'plugins/**/node_modules/**',
      'plugins/**/dist/**',
      'packages/**/node_modules/**',
      'packages/**/dist/**',
      'docs/api/**',                // Generated documentation files
      'docs/.typedoc/**',           // Generated TypeDoc HTML bundle
      'docs/.vitepress/dist/**',    // Built site
      'docs/.vitepress/cache/**'
    ]
  }
];
