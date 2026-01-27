const mockFs = {
  promises: {
    writeFile: jest.fn(),
    mkdir: jest.fn()
  },
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
};

jest.mock('fs', () => mockFs);
jest.mock('path', () => {
  const actualPath = jest.requireActual('path');
  return {
    ...actualPath,
    resolve: jest.fn((p) => p),
    normalize: jest.fn((p) => p),
    dirname: jest.fn(() => '.')
  };
});

const { saveAsJson, saveAsJsonSync, validateJsonFilePath } = require('../json-save');

describe('json-save error paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.promises.writeFile.mockResolvedValue();
    mockFs.promises.mkdir.mockResolvedValue();
    mockFs.writeFileSync.mockReturnValue();
    mockFs.existsSync.mockReturnValue(true);
  });

  test('validateJsonFilePath rejects non-string paths', () => {
    expect(() => validateJsonFilePath(null)).toThrow('File path must be a non-empty string');
    expect(() => validateJsonFilePath(123)).toThrow('File path must be a non-empty string');
  });

  test('saveAsJson rejects invalid options', async () => {
    await expect(saveAsJson({ a: 1 }, 'test.json', 'nope'))
      .rejects
      .toThrow('Options must be an object');
    await expect(saveAsJson({ a: 1 }, 'test.json', { prettyPrint: 'yes' }))
      .rejects
      .toThrow('prettyPrint must be a boolean');
    await expect(saveAsJson({ a: 1 }, 'test.json', { maxSize: -1 }))
      .rejects
      .toThrow('maxSize must be a positive number');
  });

  test('saveAsJson rejects null data', async () => {
    await expect(saveAsJson(null, 'test.json'))
      .rejects
      .toThrow('Data cannot be null or undefined');
  });

  test('saveAsJson wraps JSON stringify errors', async () => {
    const data = {
      toJSON() {
        throw new Error('boom');
      }
    };

    await expect(saveAsJson(data, 'test.json'))
      .rejects
      .toThrow('Failed to stringify JSON: boom');
  });

  test('saveAsJson enforces size limits', async () => {
    await expect(saveAsJson({ big: 'x' }, 'test.json', { maxSize: 1 }))
      .rejects
      .toThrow('JSON size exceeds maximum limit');
  });

  test('saveAsJson maps write errors to FileSystemError', async () => {
    const error = new Error('no access');
    error.code = 'EACCES';
    mockFs.promises.writeFile.mockRejectedValueOnce(error);

    await expect(saveAsJson({ a: 1 }, 'test.json'))
      .rejects
      .toThrow('Permission denied');
  });

  test('saveAsJson maps ENOENT and ENOSPC errors', async () => {
    const missingDir = new Error('missing');
    missingDir.code = 'ENOENT';
    mockFs.promises.writeFile.mockRejectedValueOnce(missingDir);
    await expect(saveAsJson({ a: 1 }, 'test.json'))
      .rejects
      .toThrow('Directory does not exist');

    const noSpace = new Error('full');
    noSpace.code = 'ENOSPC';
    mockFs.promises.writeFile.mockRejectedValueOnce(noSpace);
    await expect(saveAsJson({ a: 1 }, 'test.json'))
      .rejects
      .toThrow('No space left on device');
  });

  test('saveAsJson maps unknown write errors', async () => {
    const error = new Error('oops');
    error.code = 'EOTHER';
    mockFs.promises.writeFile.mockRejectedValueOnce(error);

    await expect(saveAsJson({ a: 1 }, 'test.json'))
      .rejects
      .toThrow('Failed to write JSON file: oops');
  });

  test('saveAsJsonSync maps write errors to FileSystemError', () => {
    const error = new Error('disk full');
    error.code = 'ENOSPC';
    mockFs.writeFileSync.mockImplementationOnce(() => {
      throw error;
    });

    expect(() => saveAsJsonSync({ a: 1 }, 'test.json'))
      .toThrow('No space left on device');
  });

  test('saveAsJsonSync supports prettyPrint and creates directories', () => {
    mockFs.existsSync.mockReturnValueOnce(false);
    saveAsJsonSync({ a: 1 }, 'test.json', { prettyPrint: true });
    expect(mockFs.mkdirSync).toHaveBeenCalled();
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      'test.json',
      '{\n  "a": 1\n}',
      'utf8'
    );
  });

  test('saveAsJsonSync maps ENOENT and EACCES errors', () => {
    const missingDir = new Error('missing');
    missingDir.code = 'ENOENT';
    mockFs.writeFileSync.mockImplementationOnce(() => {
      throw missingDir;
    });
    expect(() => saveAsJsonSync({ a: 1 }, 'test.json'))
      .toThrow('Directory does not exist');

    const denied = new Error('denied');
    denied.code = 'EACCES';
    mockFs.writeFileSync.mockImplementationOnce(() => {
      throw denied;
    });
    expect(() => saveAsJsonSync({ a: 1 }, 'test.json'))
      .toThrow('Permission denied');
  });

  test('saveAsJsonSync maps unknown errors', () => {
    const error = new Error('oops');
    error.code = 'EOTHER';
    mockFs.writeFileSync.mockImplementationOnce(() => {
      throw error;
    });
    expect(() => saveAsJsonSync({ a: 1 }, 'test.json'))
      .toThrow('Failed to write JSON file: oops');
  });

  test('saveAsJsonSync handles circular and size limit errors', () => {
    const circular = {};
    circular.self = circular;
    expect(() => saveAsJsonSync(circular, 'test.json'))
      .toThrow('circular references');

    expect(() => saveAsJsonSync({ a: 'x' }, 'test.json', { maxSize: 1 }))
      .toThrow('JSON size exceeds maximum limit');
  });

  test('saveAsJsonSync wraps non-circular stringify errors', () => {
    const data = {
      toJSON() {
        throw new Error('boom');
      }
    };

    expect(() => saveAsJsonSync(data, 'test.json'))
      .toThrow('Failed to stringify JSON: boom');
  });
});
