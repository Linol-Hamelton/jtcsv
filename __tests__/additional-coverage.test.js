describe('saveAsCsv - Edge Cases', () => {
  // For saveAsCsv tests, we need to mock fs
  // We'll use jest.doMock to mock only for these tests
    
  let mockFs;
  let mockPath;
    
  beforeEach(() => {
    // Mock fs and path for saveAsCsv tests
    jest.doMock('fs', () => ({
      promises: {
        writeFile: jest.fn(),
        mkdir: jest.fn()
      }
    }));
      
    jest.doMock('path', () => ({
      resolve: jest.fn((p) => `/absolute/${p}`),
      normalize: jest.fn((p) => p),
      dirname: jest.fn((p) => '/absolute/dir'),
      extname: jest.fn((p) => '.csv')
    }));
      
    // Re-import the module to get mocked dependencies
    jest.resetModules();
    const index = require('../index');
    mockFs = require('fs');
    mockPath = require('path');
      
    // Get fresh references to functions
    saveAsCsv = index.saveAsCsv;
  });
    
  afterEach(() => {
    jest.dontMock('fs');
    jest.dontMock('path');
    jest.resetModules();
  });

  test('should handle directory creation failure', async () => {
    const error = new Error('Permission denied');
    error.code = 'EACCES';
    mockFs.promises.mkdir.mockRejectedValue(error);
      
    await expect(saveAsCsv([{ id: 1 }], 'test.csv'))
      .rejects
      .toThrow(expect.objectContaining({
        name: 'FileSystemError',
        code: 'FILE_SYSTEM_ERROR'
      }));
  });

  test('should handle disk space error', async () => {
    mockFs.promises.mkdir.mockResolvedValue();
    const error = new Error('No space left');
    error.code = 'ENOSPC';
    mockFs.promises.writeFile.mockRejectedValue(error);
      
    await expect(saveAsCsv([{ id: 1 }], 'test.csv'))
      .rejects
      .toThrow(expect.objectContaining({
        name: 'FileSystemError',
        code: 'FILE_SYSTEM_ERROR'
      }));
  });

  test('should handle generic file system errors', async () => {
    mockFs.promises.mkdir.mockResolvedValue();
    const error = new Error('Unknown error');
    error.code = 'UNKNOWN';
    mockFs.promises.writeFile.mockRejectedValue(error);
      
    await expect(saveAsCsv([{ id: 1 }], 'test.csv'))
      .rejects
      .toThrow(expect.objectContaining({
        name: 'FileSystemError',
        code: 'FILE_SYSTEM_ERROR'
      }));
  });

  test('should not log success in test environment', async () => {
    // Mock console.log specifically for this test
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    mockFs.promises.mkdir.mockResolvedValue();
    mockFs.promises.writeFile.mockResolvedValue();
      
    await saveAsCsv([{ id: 1 }], 'test.csv');
      
    expect(consoleLogSpy).not.toHaveBeenCalled();

    // Restore the mock
    consoleLogSpy.mockRestore();
  });
});
