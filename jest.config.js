const IS_COVERAGE_RUN = process.env.npm_lifecycle_event === 'test:coverage' ||
  process.argv.includes('--coverage');
const ENFORCE_COVERAGE = process.env.JTCSV_COVERAGE_STRICT === '1';
const COVERAGE_TARGET = process.env.JTCSV_COVERAGE_TARGET || 'ts';
const COVERAGE_SCOPE = process.env.JTCSV_COVERAGE_SCOPE || 'full';

const COVERAGE_JS_FULL = [
  'index.js',
  'json-to-csv.js',
  'csv-to-json.js',
  'stream-json-to-csv.js',
  'stream-csv-to-json.js',
  'json-save.js',
  'errors.js',
  'src/**/*.js',
  '!src/engines/fast-path-engine-new.js',
  '!src/core/node-optimizations.js',
  '!src/index-with-plugins.js',
  '!src/browser/**',
  '!**/__tests__/**',
  '!**/demo/**',
  '!**/examples/**',
  '!**/packages/**',
  '!**/plugins/**',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/coverage/**'
];

const COVERAGE_JS_ENTRY = [
  'index.js',
  'json-to-csv.js',
  'csv-to-json.js',
  'stream-json-to-csv.js',
  'stream-csv-to-json.js',
  'json-save.js',
  'errors.js'
];

const COVERAGE_TS_FULL = [
  'index.ts',
  'json-to-csv.ts',
  'csv-to-json.ts',
  'stream-json-to-csv.ts',
  'stream-csv-to-json.ts',
  'json-save.ts',
  'errors.ts',
  'src/**/*.ts',
  '!src/engines/fast-path-engine-new.ts',
  '!src/core/node-optimizations.ts',
  '!src/index-with-plugins.ts',
  '!src/browser/**',
  '!**/__tests__/**',
  '!**/demo/**',
  '!**/examples/**',
  '!**/packages/**',
  '!**/plugins/**',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/coverage/**'
];

const COVERAGE_TS_ENTRY = [
  'index.ts',
  'json-to-csv.ts',
  'csv-to-json.ts',
  'stream-json-to-csv.ts',
  'stream-csv-to-json.ts',
  'json-save.ts',
  'errors.ts'
];

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts', '**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/setup-jest.js',
    // Skip benchmark tests in normal runs for speed
    ...(process.env.SKIP_BENCHMARKS ? ['**/benchmark*.test.js', '**/*-benchmark.test.js', '**/benchmark*.test.ts', '**/*-benchmark.test.ts'] : [])
  ],
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: false,
      diagnostics: {
        warnOnly: true // Предупреждения вместо ошибок для постепенной миграции
      }
    }],
    '^.+\\.jsx?$': 'babel-jest', // Для поддержки динамических импортов в JS файлах
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jtcsv)/)'
  ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^jtcsv$': '<rootDir>/index.ts',
    '^jtcsv/browser$': '<rootDir>/src/browser/index.ts',
    '^jtcsv/plugins$': '<rootDir>/src/index-with-plugins.ts',
    '^jtcsv/schema$': '<rootDir>/src/utils/schema-validator.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.ts$': '$1',
  },
  // Suppress console.log during tests for better performance
  silent: true,
  verbose: false,
  collectCoverageFrom: COVERAGE_TARGET === 'ts'
    ? (COVERAGE_SCOPE === 'entry' ? COVERAGE_TS_ENTRY : COVERAGE_TS_FULL)
    : (COVERAGE_SCOPE === 'entry' ? COVERAGE_JS_ENTRY : COVERAGE_JS_FULL),
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup-jest.js'],
  ...(IS_COVERAGE_RUN && !ENFORCE_COVERAGE
    ? {}
    : {
        coverageThreshold: {
          global: {
            branches: 65,
            functions: 70,
            lines: 70,
            statements: 70
          }
        }
      }),
  // Performance optimizations
  maxWorkers: process.platform === 'win32' ? 1 : '80%',
  workerIdleMemoryLimit: '1GB',
  cache: true,
  // Disable open handles detection for speed
  detectOpenHandles: false,
  // Increase test timeout for slow tests
  testTimeout: 10000
};
