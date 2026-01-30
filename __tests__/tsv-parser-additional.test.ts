import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import TsvParser from '../src/formats/tsv-parser';
import {
  ValidationError,
  SecurityError,
  FileSystemError
} from '../errors';

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'jtcsv-'));
}

async function withMockedFs(mockFs, fn) {
  jest.resetModules();
  jest.doMock('fs', () => mockFs);
  let LocalTsvParser;
  let LocalErrors;
  jest.isolateModules(() => {
    LocalTsvParser = require('../src/formats/tsv-parser');
    LocalErrors = require('../errors');
  });

  try {
    await fn(LocalTsvParser, LocalErrors);
  } finally {
    jest.dontMock('fs');
    jest.resetModules();
  }
}

describe('TsvParser additional coverage', () => {
  test('rejects invalid file path input', () => {
    expect(() => TsvParser.readTsvAsJsonSync(123)).toThrow(ValidationError);
    expect(() => TsvParser.readTsvAsJsonSync('')).toThrow(ValidationError);
  });

  test('rejects non-tsv extension', () => {
    expect(() => TsvParser.saveAsTsvSync([], 'data.csv')).toThrow(ValidationError);
  });

  test('rejects directory traversal in path', () => {
    expect(() => TsvParser.readTsvAsJsonSync('../data.tsv')).toThrow(SecurityError);
  });

  test('isTsv skips empty lines', () => {
    const sample = '\n\nid\tname\n1\tJohn\n';
    expect(TsvParser.isTsv(sample)).toBe(true);
  });

  test('validateTsv returns no data error for empty input', () => {
    const result = TsvParser.validateTsv('\n \n');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No data found in TSV');
  });

  test('readTsvAsJson maps ENOENT to FileSystemError', async () => {
    const missingPath = path.join(
      os.tmpdir(),
      `jtcsv-missing-${Date.now()}.tsv`
    );
    if (fs.existsSync(missingPath)) {
      fs.rmSync(missingPath, { force: true });
    }

    try {
      await TsvParser.readTsvAsJson(missingPath);
      throw new Error('Expected readTsvAsJson to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.message).toContain('File not found');
    }
  });

  test('readTsvAsJson maps EISDIR to FileSystemError', async () => {
    const tempDir = createTempDir();
    const dirPath = path.join(tempDir, 'dir.tsv');
    fs.mkdirSync(dirPath);

    try {
      await TsvParser.readTsvAsJson(dirPath);
      throw new Error('Expected readTsvAsJson to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.message).toContain('Path is a directory');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('readTsvAsJsonSync maps EISDIR to FileSystemError', () => {
    const tempDir = createTempDir();
    const dirPath = path.join(tempDir, 'dir.tsv');
    fs.mkdirSync(dirPath);

    try {
      expect(() => TsvParser.readTsvAsJsonSync(dirPath)).toThrow(FileSystemError);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('readTsvAsJsonSync reads TSV content', () => {
    const tempDir = createTempDir();
    const filePath = path.join(tempDir, 'input.tsv');
    const tsvContent = 'id\tname\n1\tJohn\n2\tJane';

    try {
      fs.writeFileSync(filePath, tsvContent, 'utf8');
      const result = TsvParser.readTsvAsJsonSync(filePath);
      expect(result).toEqual([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' }
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('readTsvAsJsonSync maps ENOENT to FileSystemError', () => {
    const missingPath = path.join(
      os.tmpdir(),
      `jtcsv-missing-sync-${Date.now()}.tsv`
    );
    if (fs.existsSync(missingPath)) {
      fs.rmSync(missingPath, { force: true });
    }

    try {
      TsvParser.readTsvAsJsonSync(missingPath);
      throw new Error('Expected readTsvAsJsonSync to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.message).toContain('File not found');
    }
  });

  test('saveAsTsvSync writes TSV output', () => {
    const tempDir = createTempDir();
    const filePath = path.join(tempDir, 'out.tsv');
    const data = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' }
    ];

    try {
      TsvParser.saveAsTsvSync(data, filePath);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
      expect(lines).toEqual(['id\tname', '1\tJohn', '2\tJane']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('TsvParser error mapping with mocked fs', () => {
  test('readTsvAsJson maps EACCES', async () => {
    const error = Object.assign(new Error('Denied'), { code: 'EACCES' });
    await withMockedFs(
      { promises: { readFile: jest.fn().mockRejectedValue(error) } },
      async (LocalTsvParser) => {
        try {
          await LocalTsvParser.readTsvAsJson('file.tsv');
          throw new Error('Expected readTsvAsJson to fail');
        } catch (err) {
          expect(err.name).toBe('FileSystemError');
          expect(err.message).toContain('Permission denied');
        }
      }
    );
  });

  test('readTsvAsJson maps unknown errors', async () => {
    const error = Object.assign(new Error('Boom'), { code: 'EOTHER' });
    await withMockedFs(
      { promises: { readFile: jest.fn().mockRejectedValue(error) } },
      async (LocalTsvParser) => {
        try {
          await LocalTsvParser.readTsvAsJson('file.tsv');
          throw new Error('Expected readTsvAsJson to fail');
        } catch (err) {
          expect(err.name).toBe('FileSystemError');
          expect(err.message).toContain('Failed to read TSV file: Boom');
        }
      }
    );
  });

  test('readTsvAsJsonSync maps EACCES', async () => {
    const error = Object.assign(new Error('Denied'), { code: 'EACCES' });
    await withMockedFs(
      {
        readFileSync: jest.fn(() => {
          throw error;
        })
      },
      async (LocalTsvParser) => {
        try {
          LocalTsvParser.readTsvAsJsonSync('file.tsv');
          throw new Error('Expected readTsvAsJsonSync to fail');
        } catch (err) {
          expect(err.name).toBe('FileSystemError');
          expect(err.message).toContain('Permission denied');
        }
      }
    );
  });

  test('readTsvAsJsonSync maps unknown errors', async () => {
    const error = Object.assign(new Error('Boom'), { code: 'EOTHER' });
    await withMockedFs(
      {
        readFileSync: jest.fn(() => {
          throw error;
        })
      },
      async (LocalTsvParser) => {
        try {
          LocalTsvParser.readTsvAsJsonSync('file.tsv');
          throw new Error('Expected readTsvAsJsonSync to fail');
        } catch (err) {
          expect(err.name).toBe('FileSystemError');
          expect(err.message).toContain('Failed to read TSV file: Boom');
        }
      }
    );
  });

  test('saveAsTsv maps ENOENT', async () => {
    const error = Object.assign(new Error('No dir'), { code: 'ENOENT' });
    await withMockedFs(
      {
        promises: {
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockRejectedValue(error)
        }
      },
      async (LocalTsvParser) => {
        try {
          await LocalTsvParser.saveAsTsv([{ id: 1 }], 'out.tsv');
          throw new Error('Expected saveAsTsv to fail');
        } catch (err) {
          expect(err.name).toBe('FileSystemError');
          expect(err.message).toContain('Directory does not exist');
        }
      }
    );
  });

  test('saveAsTsv maps EACCES', async () => {
    const error = Object.assign(new Error('Denied'), { code: 'EACCES' });
    await withMockedFs(
      {
        promises: {
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockRejectedValue(error)
        }
      },
      async (LocalTsvParser) => {
        try {
          await LocalTsvParser.saveAsTsv([{ id: 1 }], 'out.tsv');
          throw new Error('Expected saveAsTsv to fail');
        } catch (err) {
          expect(err.name).toBe('FileSystemError');
          expect(err.message).toContain('Permission denied');
        }
      }
    );
  });

  test('saveAsTsv maps ENOSPC', async () => {
    const error = Object.assign(new Error('No space'), { code: 'ENOSPC' });
    await withMockedFs(
      {
        promises: {
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockRejectedValue(error)
        }
      },
      async (LocalTsvParser) => {
        try {
          await LocalTsvParser.saveAsTsv([{ id: 1 }], 'out.tsv');
          throw new Error('Expected saveAsTsv to fail');
        } catch (err) {
          expect(err.name).toBe('FileSystemError');
          expect(err.message).toContain('No space left on device');
        }
      }
    );
  });

  test('saveAsTsv maps unknown errors', async () => {
    const error = Object.assign(new Error('Boom'), { code: 'EOTHER' });
    await withMockedFs(
      {
        promises: {
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockRejectedValue(error)
        }
      },
      async (LocalTsvParser) => {
        try {
          await LocalTsvParser.saveAsTsv([{ id: 1 }], 'out.tsv');
          throw new Error('Expected saveAsTsv to fail');
        } catch (err) {
          expect(err.name).toBe('FileSystemError');
          expect(err.message).toContain('Failed to save TSV file: Boom');
        }
      }
    );
  });

  test('readTsvAsJson rethrows ValidationError', async () => {
    const mockFs = { promises: { readFile: jest.fn() } };
    await withMockedFs(mockFs, async (LocalTsvParser, LocalErrors) => {
      const error = new LocalErrors.ValidationError('Bad input');
      mockFs.promises.readFile.mockRejectedValue(error);

      try {
        await LocalTsvParser.readTsvAsJson('file.tsv');
        throw new Error('Expected readTsvAsJson to fail');
      } catch (err) {
        expect(err.name).toBe('ValidationError');
        expect(err.message).toContain('Bad input');
      }
    });
  });

  test('readTsvAsJsonSync rethrows SecurityError', async () => {
    const mockFs = { readFileSync: jest.fn() };
    await withMockedFs(mockFs, async (LocalTsvParser, LocalErrors) => {
      const error = new LocalErrors.SecurityError('Blocked');
      mockFs.readFileSync.mockImplementation(() => {
        throw error;
      });

      try {
        LocalTsvParser.readTsvAsJsonSync('file.tsv');
        throw new Error('Expected readTsvAsJsonSync to fail');
      } catch (err) {
        expect(err.name).toBe('SecurityError');
        expect(err.message).toContain('Blocked');
      }
    });
  });
});
