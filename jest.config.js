module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
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
  setupFilesAfterEnv: ['<rootDir>/tests/setup-jest.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};


