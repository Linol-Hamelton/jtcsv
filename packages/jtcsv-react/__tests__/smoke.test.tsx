/**
 * jtcsv-react — smoke tests.
 *
 * We mock 'jtcsv/browser' to keep tests fast and to avoid pulling the real
 * CSV pipeline through ts-jest. The mocks below are intentionally tiny.
 */

import * as React from 'react';
import { act, render, renderHook, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const parseCsvFileMock = jest.fn();
const downloadAsCsvMock = jest.fn();

jest.mock('jtcsv/browser', () => ({
  parseCsvFile: (...args: any[]) => parseCsvFileMock(...args),
  csvToJson: (csv: string) => {
    if (csv === '__INVALID__') {
      const err = new Error('parse failed');
      throw err;
    }
    if (csv == null) return [];
    const lines = String(csv).trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',');
    return lines.slice(1).map((line) => {
      const cells = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = cells[i];
      });
      return row;
    });
  },
  downloadAsCsv: (...args: any[]) => downloadAsCsvMock(...args),
  ValidationError: class ValidationError extends Error {},
  ParsingError: class ParsingError extends Error {},
  SecurityError: class SecurityError extends Error {},
  FileSystemError: class FileSystemError extends Error {},
  LimitError: class LimitError extends Error {},
  ConfigurationError: class ConfigurationError extends Error {},
  ERROR_CODES: { PARSE_FAILED: 'PARSE_FAILED' },
}));

// Import AFTER the mock is set up.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const lib = require('../src/index');
const { useCsvUpload, useCsvParse, useCsvDownload, CsvDropZone } = lib;

beforeEach(() => {
  parseCsvFileMock.mockReset();
  downloadAsCsvMock.mockReset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(content: string, name = 'test.csv', type = 'text/csv'): File {
  return new File([content], name, { type });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCsvUpload', () => {
  test('(a) returns the expected shape', () => {
    const { result } = renderHook(() => useCsvUpload());
    expect(typeof result.current.handleFiles).toBe('function');
    expect(result.current.isParsing).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dropzoneProps).toEqual(
      expect.objectContaining({
        onDragOver: expect.any(Function),
        onDragLeave: expect.any(Function),
        onDragEnter: expect.any(Function),
        onDrop: expect.any(Function),
      })
    );
  });

  test('(b) handleFiles with one file calls onParsed with parsed rows', async () => {
    const rows = [{ a: '1', b: '2' }];
    parseCsvFileMock.mockResolvedValueOnce(rows);
    const onParsed = jest.fn();
    const { result } = renderHook(() => useCsvUpload({ onParsed }));

    await act(async () => {
      await result.current.handleFiles([makeFile('a,b\n1,2')]);
    });

    expect(parseCsvFileMock).toHaveBeenCalledTimes(1);
    expect(onParsed).toHaveBeenCalledWith(rows);
  });

  test('(c) handleFiles fires onError when parse rejects', async () => {
    const boom = new Error('boom');
    parseCsvFileMock.mockRejectedValueOnce(boom);
    const onError = jest.fn();
    const { result } = renderHook(() => useCsvUpload({ onError }));

    await act(async () => {
      await result.current.handleFiles([makeFile('a,b\n1,2')]);
    });

    expect(onError).toHaveBeenCalledWith(boom);
    expect(result.current.error).toBe(boom);
  });

  test('(d) dropzoneProps toggle isDragging and onDrop calls handleFiles', async () => {
    parseCsvFileMock.mockResolvedValueOnce([]);
    const onParsed = jest.fn();
    const { result } = renderHook(() => useCsvUpload({ onParsed }));

    const fakeEvt = (files: File[] | null = null): any => ({
      preventDefault: jest.fn(),
      dataTransfer: files ? { files } : undefined,
    });

    act(() => {
      result.current.dropzoneProps.onDragEnter(fakeEvt());
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.dropzoneProps.onDragLeave(fakeEvt());
    });
    expect(result.current.isDragging).toBe(false);

    await act(async () => {
      result.current.dropzoneProps.onDrop(fakeEvt([makeFile('a,b\n1,2')]));
      // Let the async handleFiles inside onDrop settle.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(parseCsvFileMock).toHaveBeenCalled();
  });
});

describe('useCsvParse', () => {
  test('(e) returns { data: null } when text is null', () => {
    const { result } = renderHook(() => useCsvParse(null));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isParsing).toBe(false);
  });

  test('(f) parses a valid CSV string', () => {
    const { result } = renderHook(() => useCsvParse('a,b\n1,2'));
    expect(result.current.data).toEqual([{ a: '1', b: '2' }]);
    expect(result.current.error).toBeNull();
  });

  test('(g) sets error on invalid CSV', () => {
    const { result } = renderHook(() => useCsvParse('__INVALID__'));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeNull();
  });
});

describe('useCsvDownload', () => {
  test('(h) downloadCsv invokes downloadAsCsv and returns undefined', () => {
    const { result } = renderHook(() => useCsvDownload());
    const ret = result.current.downloadCsv([{ a: 1 }], 'out.csv', {});
    expect(ret).toBeUndefined();
    expect(downloadAsCsvMock).toHaveBeenCalledWith([{ a: 1 }], 'out.csv', {});
  });
});

describe('<CsvDropZone />', () => {
  test('(i) renders default UI', () => {
    render(<CsvDropZone />);
    expect(screen.getByText('Drop CSV here')).toBeTruthy();
  });

  test('(j) onParsed wired through to useCsvUpload', async () => {
    const rows = [{ x: 'y' }];
    parseCsvFileMock.mockResolvedValueOnce(rows);
    const onParsed = jest.fn();
    render(<CsvDropZone onParsed={onParsed} />);

    const input = screen.getByTestId('jtcsv-react-file-input') as HTMLInputElement;
    const file = makeFile('x\ny');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    await act(async () => {
      fireEvent.change(input);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(parseCsvFileMock).toHaveBeenCalled();
    expect(onParsed).toHaveBeenCalledWith(rows);
  });
});
