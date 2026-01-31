import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

const mockJtcsv = () => jest.requireActual('../../index');

function setupCommonMocks() {
  jest.doMock('jtcsv', () => mockJtcsv(), { virtual: true });
  jest.doMock('fastify-plugin', () => (fn) => fn, { virtual: true });
  jest.doMock('@nuxt/kit', () => ({
    defineNuxtModule: (mod) => mod,
    addPlugin: jest.fn(),
    addImports: jest.fn(),
    createResolver: () => ({ resolve: (p) => p })
  }), { virtual: true });
  jest.doMock('@nestjs/common', () => ({
    Injectable: () => (target) => target,
    UseInterceptors: (...args) => ({ args })
  }), { virtual: true });
  jest.doMock('rxjs/operators', () => ({
    map: () => (source) => source
  }), { virtual: true });
}

describe('Plugin smoke tests', () => {
  beforeEach(() => {
    jest.resetModules();
    setupCommonMocks();
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('fastify plugin exports', () => {
    jest.isolateModules(() => {
      const plugin = require('../../plugins/fastify-plugin');
      expect(typeof plugin).toBe('function');
      expect(typeof plugin.jtcsvFastifyPlugin).toBe('function');
    });
  });

  test('hono plugin exports', () => {
    jest.isolateModules(() => {
      const hono = require('../../plugins/hono');
      expect(typeof hono.csvMiddleware).toBe('function');
      expect(typeof hono.createCsvResponse).toBe('function');
    });
  });

  test('nestjs plugin exports', () => {
    jest.isolateModules(() => {
      const nest = require('../../plugins/nestjs');
      expect(typeof nest.CsvParserInterceptor).toBe('function');
      expect(typeof nest.CsvDownloadDecorator).toBe('function');
      expect(typeof nest.createCsvParserInterceptor).toBe('function');
      expect(typeof nest.createCsvDownloadInterceptor).toBe('function');
    });
  });

  test('trpc plugin exports', () => {
    jest.isolateModules(() => {
      const trpc = require('../../plugins/trpc');
      expect(typeof trpc.createCsvProcedure).toBe('function');
      expect(() => trpc.createCsvProcedure(null, {})).toThrow();
    });
  });

  test('remix plugin exports', () => {
    jest.isolateModules(() => {
      const remix = require('../../plugins/remix');
      expect(typeof remix.parseFormData).toBe('function');
      expect(typeof remix.generateCsvResponse).toBe('function');
    });
  });

  test('sveltekit plugin exports', () => {
    jest.isolateModules(() => {
      const sveltekit = require('../../plugins/sveltekit');
      expect(typeof sveltekit.parseCsv).toBe('function');
      expect(typeof sveltekit.generateCsv).toBe('function');
    });
  });

  test('nuxt module exports', () => {
    jest.isolateModules(() => {
      const nuxt = require('../../plugins/nuxt');
      expect(nuxt).toHaveProperty('meta');
      expect(nuxt).toHaveProperty('setup');
      expect(typeof nuxt.setup).toBe('function');
    });
  });

  test('nextjs exports route helpers', async () => {
    jest.isolateModules(() => {
      global.React = {
        useState: jest.fn(() => [null, jest.fn()]),
        useCallback: jest.fn((fn) => fn),
        useRef: jest.fn(() => ({ current: null })),
        createContext: jest.fn(() => ({ Provider: ({ children }) => children })),
        useMemo: jest.fn((fn) => fn()),
        useContext: jest.fn(() => ({})),
        cloneElement: jest.fn((child) => child)
      };

      const nextjs = require('../../plugins/nextjs-api');
      expect(typeof nextjs.useJtcsv).toBe('function');
      expect(typeof nextjs.CsvFileUploader).toBe('function');
      expect(typeof nextjs.downloadCsv).toBe('function');

      const route = require('../../plugins/nextjs-api/route');
      expect(typeof route.default).toBe('function');

      delete global.React;
    });
  });
});
