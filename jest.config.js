module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/setup-jest.js'],
  collectCoverageFrom: [
    'index.js',
    'json-to-csv.js',
    'csv-to-json.js',
    'stream-json-to-csv.js',
    'stream-csv-to-json.js',
    'json-save.js',
    'errors.js',
    'src/core/**/*.js',
    'src/engines/**/*.js',
    'src/formats/**/*.js',
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
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup-jest.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  // Performance optimizations for CI/Linux
  maxWorkers: process.env.CI === 'true' ? '50%' : '75%',
  workerIdleMemoryLimit: '512MB',
  cache: true,
  // cacheDirectory: process.env.CI === 'true' ? '/tmp/jest-cache' : undefined, // Removed due to Windows path issues
  // Detect open handles (can be slow, disable in CI)
  detectOpenHandles: process.env.CI !== 'true'
};


