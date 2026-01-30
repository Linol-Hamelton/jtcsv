// Конфигурация Jest для TypeScript тестов
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Корневая директория
  roots: ['<rootDir>'],
  
  // Расширения файлов для тестов
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Сопоставление путей модулей
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@browser/(.*)$': '<rootDir>/src/browser/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@engines/(.*)$': '<rootDir>/src/engines/$1',
    '^@formats/(.*)$': '<rootDir>/src/formats/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  
  // Трансформация файлов
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.dev.json',
      isolatedModules: true
    }],
    '^.+\\.js$': 'babel-jest'
  },
  
  // Игнорируемые пути
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/dist-types/',
    '__tests__/benchmark-suite.test.js',
    '__tests__/load-tests.test.js',
    '__tests__/soak-memory.test.js',
    '__tests__/security-fuzzing.test.js',
    '__tests__/memory-profiling.test.js'
  ],
  
  // Паттерны для поиска тестов
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  
  // Сбор покрытия кода
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/dist-types/**'
  ],
  
  coverageDirectory: 'coverage-ts',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Настройки для TypeScript
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.dev.json'
    }
  },
  
  // Настройки для тестов
  testTimeout: 30000,
  verbose: true,
  bail: false,
  
  // Настройки для watch mode
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/dist-types/',
    '<rootDir>/coverage/',
    '<rootDir>/coverage-ts/'
  ]
};