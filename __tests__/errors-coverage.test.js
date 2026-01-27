const {
  JtcsvError,
  ValidationError,
  createErrorMessage,
  handleError,
  safeExecute,
  safeExecuteSync,
  safeExecuteAsync
} = require('../errors');

describe('errors module coverage', () => {
  test('createErrorMessage falls back to unknown error', () => {
    expect(createErrorMessage('NOT_A_REAL_CODE', 'oops'))
      .toBe('Unknown error: oops');
  });

  test('handleError logs details in development', () => {
    const originalEnv = process.env.NODE_ENV;
    const error = new ValidationError('Bad input');
    const logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      process.env.NODE_ENV = 'development';
      expect(() => handleError(error, { function: 'testFunction' }))
        .toThrow(ValidationError);
      expect(logSpy).toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
      logSpy.mockRestore();
    }
  });

  test('safeExecute returns sync results', () => {
    const result = safeExecute(() => 'ok', 'INVALID_INPUT');
    expect(result).toBe('ok');
  });

  test('safeExecute rethrows known errors', () => {
    const error = new ValidationError('Known');
    expect(() => safeExecute(() => { throw error; }, 'INVALID_INPUT'))
      .toThrow(error);
  });

  test('safeExecuteSync wraps unknown sync errors', () => {
    try {
      safeExecuteSync(() => {
        throw new Error('sync boom');
      }, 'INVALID_INPUT', { function: 'syncTest' });
      throw new Error('Expected to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(JtcsvError);
      expect(error.code).toBe('INVALID_INPUT');
      expect(error.message).toBe('Invalid input: sync boom');
      expect(error.originalError).toBeInstanceOf(Error);
    }
  });

  test('safeExecuteSync rethrows known errors', () => {
    const error = new ValidationError('Known');
    expect(() => safeExecuteSync(() => { throw error; }, 'INVALID_INPUT'))
      .toThrow(error);
  });

  test('safeExecuteAsync wraps unknown async errors', async () => {
    await expect(
      safeExecuteAsync(async () => {
        throw new Error('async boom');
      }, 'PARSE_FAILED', { function: 'asyncTest' })
    ).rejects.toMatchObject({
      code: 'PARSE_FAILED',
      message: 'Parse failed: async boom'
    });
  });
});
