import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  JtcsvError,
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  ERROR_CODES,
  createErrorMessage,
  ErrorContext,
  handleError,
  safeExecute,
  safeExecuteSync,
  safeExecuteAsync
} from '../errors';

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

  test('safeExecute returns async results', async () => {
    const result = await safeExecute(async () => 'ok', 'INVALID_INPUT');
    expect(result).toBe('ok');
  });

  test('safeExecute rethrows known errors', () => {
    const error = new ValidationError('Known');
    expect(() => safeExecute(() => {
      throw error; 
    }, 'INVALID_INPUT'))
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
    expect(() => safeExecuteSync(() => {
      throw error; 
    }, 'INVALID_INPUT'))
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

  test('error classes expose codes and names', () => {
    const sec = new SecurityError('nope');
    const fsError = new FileSystemError('fs fail', new Error('root'), {
      hint: 'check permissions',
      docs: 'docs/ERRORS.md',
      context: { filePath: '/tmp/test.csv' }
    });
    const limit = new LimitError('too big', 10, 11);
    const config = new ConfigurationError('bad cfg');

    expect(sec.code).toBe('SECURITY_ERROR');
    expect(sec.name).toBe('SecurityError');
    expect(fsError.originalError).toBeInstanceOf(Error);
    expect(fsError.hint).toBe('check permissions');
    expect(fsError.docs).toBe('docs/ERRORS.md');
    expect(limit.limit).toBe(10);
    expect(limit.actual).toBe(11);
    expect(config.code).toBe('CONFIGURATION_ERROR');
  });

  test('ParsingError builds detailed messages and factories work', () => {
    const err = new ParsingError('bad', 2, 5, 'ctx', 'exp', 'act');
    expect(err.message).toContain('bad at line 2, column 5');
    expect(err.message).toContain('Context: ctx');
    expect(err.message).toContain('Expected: exp');
    expect(err.message).toContain('Actual: act');

    const csvErr = ParsingError.csvFormat('oops', 3, 1, 'row');
    expect(csvErr.message).toContain('CSV format error');

    const mismatch = ParsingError.fieldCountMismatch(2, 3, 4, 'a,b,c');
    expect(mismatch.message).toContain('Field count mismatch');

    const unclosed = ParsingError.unclosedQuotes(5, 2, 'a,\"b');
    expect(unclosed.message).toContain('Unclosed quotes');

    const invalid = ParsingError.invalidDelimiter('|', 1, 'ctx');
    expect(invalid.message).toContain('Invalid delimiter');
  });

  test('ErrorContext builds and throws typed errors', () => {
    const ctx = new ErrorContext()
      .lineNumber(1)
      .column(2)
      .context('line')
      .expected('x')
      .actual('y')
      .suggestion('fix')
      .hint('try trimming whitespace')
      .docs('docs/ERRORS.md')
      .codeSnippet('snippet');

    const message = ctx.buildMessage('base');
    expect(message).toContain('base at line 1, column 2');
    expect(message).toContain('Suggestion: fix');
    expect(message).toContain('Hint: try trimming whitespace');
    expect(message).toContain('Docs: docs/ERRORS.md');
    expect(message).toContain('Code snippet: snippet');

    expect(() => ctx.throwParsingError('parse')).toThrow(ParsingError);
    expect(() => ctx.throwValidationError('validate')).toThrow(ValidationError);
  });

  test('ERROR_CODES exposes expected keys', () => {
    expect(ERROR_CODES).toHaveProperty('INVALID_INPUT');
    expect(ERROR_CODES).toHaveProperty('PARSING_ERROR');
    expect(ERROR_CODES).toHaveProperty('CONFIGURATION_ERROR');
  });
});
