/**
 * Smoke tests for jtcsv-vue 0.1.0.
 *
 * Mocks `jtcsv/browser` so we don't pull in the real browser bundle
 * (which depends on actual File / FileReader runtime behavior).
 *
 * @jest-environment jsdom
 */

// ---- mock jtcsv/browser BEFORE importing the package under test ----
const mockParseCsvFile = jest.fn();
const mockDownloadAsCsv = jest.fn();
const mockCsvToJson = jest.fn((csv: string) => [{ csv }]);
const mockJsonToCsv = jest.fn((_data: any) => 'mocked,csv');
const mockCsvToJsonAsync = jest.fn(async (csv: string) => [{ csv }]);
const mockJsonToCsvAsync = jest.fn(async (_data: any) => 'mocked,csv');

class MockValidationError extends Error {}
class MockParsingError extends Error {}
class MockSecurityError extends Error {}
class MockFileSystemError extends Error {}
class MockLimitError extends Error {}
class MockConfigurationError extends Error {}
const MOCK_ERROR_CODES = { GENERIC: 'GENERIC' };

jest.mock('jtcsv/browser', () => ({
  csvToJson: mockCsvToJson,
  jsonToCsv: mockJsonToCsv,
  csvToJsonAsync: mockCsvToJsonAsync,
  jsonToCsvAsync: mockJsonToCsvAsync,
  parseCsvFile: mockParseCsvFile,
  downloadAsCsv: mockDownloadAsCsv,
  ValidationError: MockValidationError,
  ParsingError: MockParsingError,
  SecurityError: MockSecurityError,
  FileSystemError: MockFileSystemError,
  LimitError: MockLimitError,
  ConfigurationError: MockConfigurationError,
  ERROR_CODES: MOCK_ERROR_CODES,
}));

import { createApp, defineComponent, h } from 'vue';
import {
  createJtcsvPlugin,
  useJtcsv,
  useCsvUpload,
  ValidationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
} from '../src/index';

describe('jtcsv-vue public surface', () => {
  beforeEach(() => {
    mockParseCsvFile.mockReset();
  });

  test('a) createJtcsvPlugin returns an object with an install function', () => {
    const plugin = createJtcsvPlugin();
    expect(plugin).toBeDefined();
    expect(typeof (plugin as any).install).toBe('function');
  });

  test('b) installing on a Vue app sets app.config.globalProperties.$jtcsv', () => {
    const app = createApp({ render: () => null });
    app.use(createJtcsvPlugin());
    const gp = (app.config.globalProperties as any).$jtcsv;
    expect(gp).toBeDefined();
    expect(typeof gp.csvToJson).toBe('function');
    expect(typeof gp.jsonToCsv).toBe('function');
  });

  test('c) installing registers the csv-upload directive', () => {
    const app = createApp({ render: () => null });
    app.use(createJtcsvPlugin());
    const dir = (app as any).directive('csv-upload');
    expect(dir).toBeDefined();
    expect(typeof dir.mounted).toBe('function');
  });

  test('d) useJtcsv() throws a helpful error if called with no plugin installed', () => {
    // Outside any setup() context inject() returns the default and our
    // composable throws. Call it directly.
    expect(() => useJtcsv()).toThrow(/plugin not installed/i);
  });

  test('e) useCsvUpload returns refs initialized to false / null', async () => {
    // Run inside a Vue component setup so ref()s work in their normal context.
    let captured: ReturnType<typeof useCsvUpload> | null = null;
    const Comp = defineComponent({
      setup() {
        captured = useCsvUpload();
        return () => h('div');
      },
    });
    const app = createApp(Comp);
    const root = document.createElement('div');
    app.mount(root);
    expect(captured).not.toBeNull();
    expect(captured!.isParsing.value).toBe(false);
    expect(captured!.error.value).toBeNull();
    expect(captured!.isDragging.value).toBe(false);
    expect(typeof captured!.handleFiles).toBe('function');
    app.unmount();
  });

  test('f) useCsvUpload.handleFiles calls parseCsvFile + onParsed on success', async () => {
    const parsed = [{ a: 1 }, { a: 2 }];
    mockParseCsvFile.mockResolvedValueOnce(parsed);
    const onParsed = jest.fn();

    let api: ReturnType<typeof useCsvUpload> | null = null;
    const Comp = defineComponent({
      setup() {
        api = useCsvUpload({ onParsed });
        return () => h('div');
      },
    });
    const app = createApp(Comp);
    app.mount(document.createElement('div'));

    const fakeFile = new File(['a,b\n1,2'], 'test.csv', { type: 'text/csv' });
    const result = await api!.handleFiles([fakeFile]);
    expect(mockParseCsvFile).toHaveBeenCalledTimes(1);
    expect(mockParseCsvFile.mock.calls[0][0]).toBe(fakeFile);
    expect(result).toBe(parsed);
    expect(onParsed).toHaveBeenCalledWith(parsed, fakeFile);
    expect(api!.isParsing.value).toBe(false);
    expect(api!.error.value).toBeNull();
    app.unmount();
  });

  test('g) useCsvUpload.handleFiles fires onError when parseCsvFile rejects', async () => {
    const failure = new Error('parse boom');
    mockParseCsvFile.mockRejectedValueOnce(failure);
    const onError = jest.fn();

    let api: ReturnType<typeof useCsvUpload> | null = null;
    const Comp = defineComponent({
      setup() {
        api = useCsvUpload({ onError });
        return () => h('div');
      },
    });
    const app = createApp(Comp);
    app.mount(document.createElement('div'));

    const fakeFile = new File(['bad'], 'bad.csv', { type: 'text/csv' });
    const result = await api!.handleFiles([fakeFile]);
    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBe(failure);
    expect(api!.error.value).toBe(failure);
    expect(api!.isParsing.value).toBe(false);
    app.unmount();
  });

  test('h) Re-exported error classes are the same constructors as jtcsv/browser', () => {
    // jest.mock pinned the constructors above; the re-exports must point
    // at *those* classes, not freshly minted ones.
    const browser = require('jtcsv/browser');
    expect(ValidationError).toBe(browser.ValidationError);
    expect(ParsingError).toBe(browser.ParsingError);
    expect(SecurityError).toBe(browser.SecurityError);
    expect(FileSystemError).toBe(browser.FileSystemError);
    expect(LimitError).toBe(browser.LimitError);
    expect(ConfigurationError).toBe(browser.ConfigurationError);
  });
});
