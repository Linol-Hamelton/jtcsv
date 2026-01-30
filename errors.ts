/**
 * Custom error classes for jtcsv
 */

/**
 * Base error class for jtcsv
 */
export class JtcsvError extends Error {
  code: string;
  
  constructor(message: string, code: string = 'JTCSV_ERROR') {
    super(message);
    this.name = 'JtcsvError';
    this.code = code;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, JtcsvError);
    }
  }
}

/**
 * Error for invalid input data
 */
export class ValidationError extends JtcsvError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Error for security violations
 */
export class SecurityError extends JtcsvError {
  constructor(message: string) {
    super(message, 'SECURITY_ERROR');
    this.name = 'SecurityError';
  }
}

/**
 * Error for file system operations
 */
export class FileSystemError extends JtcsvError {
  originalError: Error | null;
  
  constructor(message: string, originalError: Error | null = null) {
    super(message, 'FILE_SYSTEM_ERROR');
    this.name = 'FileSystemError';
    this.originalError = originalError;
  }
}

/**
 * Error for parsing/formatting issues
 */
export class ParsingError extends JtcsvError {
  lineNumber: number | null;
  column: number | null;
  context: string | null;
  expected: string | null;
  actual: string | null;
  originalMessage: string;
  
  constructor(
    message: string,
    lineNumber: number | null = null,
    column: number | null = null,
    context: string | null = null,
    expected: string | null = null,
    actual: string | null = null
  ) {
    // Build detailed message
    let detailedMessage = message;
    
    if (lineNumber !== null) {
      detailedMessage += ` at line ${lineNumber}`;
      if (column !== null) {
        detailedMessage += `, column ${column}`;
      }
    }
    
    if (context !== null) {
      detailedMessage += `\nContext: ${context}`;
    }
    
    if (expected !== null && actual !== null) {
      detailedMessage += `\nExpected: ${expected}`;
      detailedMessage += `\nActual: ${actual}`;
    } else if (expected !== null) {
      detailedMessage += `\nExpected: ${expected}`;
    } else if (actual !== null) {
      detailedMessage += `\nActual: ${actual}`;
    }
    
    super(detailedMessage, 'PARSING_ERROR');
    this.name = 'ParsingError';
    this.lineNumber = lineNumber;
    this.column = column;
    this.context = context;
    this.expected = expected;
    this.actual = actual;
    this.originalMessage = message;
  }
  
  /**
   * Create a ParsingError for CSV format issues
   */
  static csvFormat(
    message: string,
    lineNumber: number | null = null,
    column: number | null = null,
    rowContent: string | null = null
  ): ParsingError {
    let context: string | null = null;
    if (rowContent !== null) {
      context = `Row content: "${rowContent.substring(0, 100)}${rowContent.length > 100 ? '...' : ''}"`;
    }
    
    return new ParsingError(
      `CSV format error: ${message}`,
      lineNumber,
      column,
      context
    );
  }
  
  /**
   * Create a ParsingError for field count mismatch
   */
  static fieldCountMismatch(
    expectedCount: number,
    actualCount: number,
    lineNumber: number | null = null,
    rowContent: string | null = null
  ): ParsingError {
    return new ParsingError(
      'Field count mismatch',
      lineNumber,
      null,
      rowContent ? `Row: "${rowContent.substring(0, 100)}${rowContent.length > 100 ? '...' : ''}"` : null,
      `${expectedCount} fields`,
      `${actualCount} fields`
    );
  }
  
  /**
   * Create a ParsingError for unclosed quotes
   */
  static unclosedQuotes(
    lineNumber: number | null = null,
    column: number | null = null,
    content: string | null = null
  ): ParsingError {
    return new ParsingError(
      'Unclosed quotes in CSV',
      lineNumber,
      column,
      content ? `Content: "${content}"` : null
    );
  }
  
  /**
   * Create a ParsingError for invalid delimiter
   */
  static invalidDelimiter(
    delimiter: string,
    lineNumber: number | null = null,
    context: string | null = null
  ): ParsingError {
    return new ParsingError(
      `Invalid delimiter '${delimiter}'`,
      lineNumber,
      null,
      context
    );
  }
}

/**
 * Error for size/limit violations
 */
export class LimitError extends JtcsvError {
  limit: any;
  actual: any;
  
  constructor(message: string, limit: any, actual: any) {
    super(message, 'LIMIT_ERROR');
    this.name = 'LimitError';
    this.limit = limit;
    this.actual = actual;
  }
}

/**
 * Error for configuration issues
 */
export class ConfigurationError extends JtcsvError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

/**
 * Utility function to create detailed error messages
 */
export function createDetailedErrorMessage(
  baseMessage: string,
  details: {
    lineNumber?: number;
    column?: number;
    context?: string;
    expected?: string;
    actual?: string;
    suggestion?: string;
    codeSnippet?: string;
  } = {}
): string {
  let message = baseMessage;
  
  if (details.lineNumber !== undefined) {
    message += ` at line ${details.lineNumber}`;
  }
  
  if (details.column !== undefined) {
    message += `, column ${details.column}`;
  }
  
  if (details.context !== undefined) {
    message += `\nContext: ${details.context}`;
  }
  
  if (details.expected !== undefined) {
    message += `\nExpected: ${details.expected}`;
  }
  
  if (details.actual !== undefined) {
    message += `\nActual: ${details.actual}`;
  }
  
  if (details.suggestion !== undefined) {
    message += `\nSuggestion: ${details.suggestion}`;
  }
  
  if (details.codeSnippet !== undefined) {
    message += `\nCode snippet: ${details.codeSnippet}`;
  }
  
  return message;
}

/**
 * Error context builder for better debugging
 */
export class ErrorContext {
  private details: {
    lineNumber?: number;
    column?: number;
    context?: string;
    expected?: string;
    actual?: string;
    suggestion?: string;
    codeSnippet?: string;
  } = {};
  
  lineNumber(line: number): this {
    this.details.lineNumber = line;
    return this;
  }
  
  column(col: number): this {
    this.details.column = col;
    return this;
  }
  
  context(ctx: string): this {
    this.details.context = ctx;
    return this;
  }
  
  expected(exp: string): this {
    this.details.expected = exp;
    return this;
  }
  
  actual(act: string): this {
    this.details.actual = act;
    return this;
  }
  
  suggestion(sugg: string): this {
    this.details.suggestion = sugg;
    return this;
  }
  
  codeSnippet(snippet: string): this {
    this.details.codeSnippet = snippet;
    return this;
  }
  
  buildMessage(baseMessage: string): string {
    return createDetailedErrorMessage(baseMessage, this.details);
  }
  
  throwParsingError(baseMessage: string): never {
    const message = this.buildMessage(baseMessage);
    throw new ParsingError(
      message,
      this.details.lineNumber,
      this.details.column,
      this.details.context,
      this.details.expected,
      this.details.actual
    );
  }
  
  throwValidationError(baseMessage: string): never {
    const message = this.buildMessage(baseMessage);
    throw new ValidationError(message);
  }
}

export const ERROR_CODES = {
  JTCSV_ERROR: 'JTCSV_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SECURITY_ERROR: 'SECURITY_ERROR',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
  LIMIT_ERROR: 'LIMIT_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PARSE_FAILED: 'PARSE_FAILED',
  SIZE_LIMIT: 'SIZE_LIMIT',
  INVALID_CONFIG: 'INVALID_CONFIG',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  STREAM_CREATION_ERROR: 'STREAM_CREATION_ERROR',
  STREAM_PROCESSING_ERROR: 'STREAM_PROCESSING_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Utility function to create standardized error messages
 */
export function createErrorMessage(type: ErrorCode, details: string): string {
  const messages: Record<ErrorCode, string> = {
    INVALID_INPUT: `Invalid input: ${details}`,
    SECURITY_VIOLATION: `Security violation: ${details}`,
    FILE_NOT_FOUND: `File not found: ${details}`,
    PARSE_FAILED: `Parse failed: ${details}`,
    SIZE_LIMIT: `Size limit exceeded: ${details}`,
    INVALID_CONFIG: `Invalid configuration: ${details}`,
    UNKNOWN_ERROR: `Unknown error: ${details}`,
    // Добавляем остальные коды для полноты
    JTCSV_ERROR: `JTCSV error: ${details}`,
    VALIDATION_ERROR: `Validation error: ${details}`,
    SECURITY_ERROR: `Security error: ${details}`,
    FILE_SYSTEM_ERROR: `File system error: ${details}`,
    PARSING_ERROR: `Parsing error: ${details}`,
    LIMIT_ERROR: `Limit error: ${details}`,
    CONFIGURATION_ERROR: `Configuration error: ${details}`,
    STREAM_CREATION_ERROR: `Stream creation error: ${details}`,
    STREAM_PROCESSING_ERROR: `Stream processing error: ${details}`
  };
  
  return messages[type] || messages.UNKNOWN_ERROR;
}

/**
 * Error handler utility
 */
/* istanbul ignore next */
export function handleError(error: Error, context: Record<string, any> = {}): never {
  // Log error in development
  if (process.env['NODE_ENV'] === 'development') {
    console.error(`[jtcsv] Error in ${context['function'] || 'unknown'}:`, {
      message: error.message,
      code: (error as any).code,
      stack: error.stack,
      context
    });
  }
  
  // Re-throw the error
  throw error;
}

/**
 * Safe execution wrapper for async functions
 */
/* istanbul ignore next */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  errorType: ErrorCode,
  context: Record<string, any> = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof JtcsvError) {
      throw error;
    }
    
    // Wrap unknown errors
    const message = createErrorMessage(errorType, (error as Error).message);
    const wrappedError = new JtcsvError(message, errorType);
    (wrappedError as any).originalError = error;
    
    handleError(wrappedError, context);
  }
}

/**
 * Safe execution wrapper for sync functions
 */
export function safeExecuteSync<T>(
  fn: () => T,
  errorType: ErrorCode,
  context: Record<string, any> = {}
): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof JtcsvError) {
      throw error;
    }
    
    // Wrap unknown errors
    const message = createErrorMessage(errorType, (error as Error).message);
    const wrappedError = new JtcsvError(message, errorType);
    (wrappedError as any).originalError = error;
    
    handleError(wrappedError, context);
  }
}

/**
 * Safe execution wrapper (auto-detects async/sync)
 */
export function safeExecute<T>(
  fn: () => T | Promise<T>,
  errorType: ErrorCode,
  context: Record<string, any> = {}
): T | Promise<T> {
  const result = fn();
  
  // Check if function returns a promise
  if (result && typeof (result as any).then === 'function') {
    return safeExecuteAsync(() => result as Promise<T>, errorType, context);
  }
  
  return safeExecuteSync(() => result as T, errorType, context);
}

// Экспорт типов для использования в других модулях
export type {
  // Типы ошибок
  JtcsvError as JtcsvErrorType,
  ValidationError as ValidationErrorType,
  SecurityError as SecurityErrorType,
  FileSystemError as FileSystemErrorType,
  ParsingError as ParsingErrorType,
  LimitError as LimitErrorType,
  ConfigurationError as ConfigurationErrorType
};