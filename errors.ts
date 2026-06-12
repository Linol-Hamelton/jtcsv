/**
 * Custom error classes for jtcsv
 */

export type ErrorContextValue = Record<string, any> | string | null;

export interface ErrorMeta {
  hint?: string;
  docs?: string;
  context?: ErrorContextValue;
  originalError?: Error | null;
}

/**
 * Base error class for jtcsv
 */
export class JtcsvError extends Error {
  code: string;
  hint?: string;
  docs?: string;
  context?: ErrorContextValue;
  originalError?: Error | null;

  constructor(message: string, code: string = 'JTCSV_ERROR', meta: ErrorMeta = {}) {
    super(message);
    this.name = 'JtcsvError';
    this.code = code;
    this.hint = meta.hint;
    this.docs = meta.docs;
    this.context = meta.context;
    this.originalError = meta.originalError;
    
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
  constructor(message: string, meta: ErrorMeta = {}) {
    super(message, 'VALIDATION_ERROR', meta);
    this.name = 'ValidationError';
  }
}

/**
 * Error for security violations
 */
export class SecurityError extends JtcsvError {
  constructor(message: string, meta: ErrorMeta = {}) {
    super(message, 'SECURITY_ERROR', meta);
    this.name = 'SecurityError';
  }
}

/**
 * Error for file system operations
 */
export class FileSystemError extends JtcsvError {
  declare originalError: Error | null;

  constructor(message: string, originalError: Error | null = null, meta: ErrorMeta = {}) {
    super(message, 'FILE_SYSTEM_ERROR', { ...meta, originalError });
    this.name = 'FileSystemError';
    this.originalError = originalError ?? meta.originalError ?? null;
  }
}

/**
 * Error for parsing/formatting issues.
 *
 * Actionable shape: every parser-thrown ParsingError should carry as much
 * locational context as is cheaply available — line, column, the offending
 * cell value (truncated), and a human-readable hint that points at the
 * most likely cause. The detailedMessage string built here is what users
 * see in their console, in this layout:
 *
 *   <category>: <core message> at line N, column M
 *   Context: <row snippet>
 *   Expected: <X> / Actual: <Y>     (if applicable)
 *   Value: "<offending cell>"        (if applicable)
 *   Hint: <what to try>              (if applicable)
 */
export class ParsingError extends JtcsvError {
  lineNumber: number | null;
  column: number | null;
  declare context: ErrorContextValue;
  expected: string | null;
  actual: string | null;
  /** The exact cell value that triggered the error, truncated to 200 chars. */
  value: string | null;
  /** Actionable next-step suggestion — usually a config flag or a fix pattern. */
  declare hint: string | undefined;
  originalMessage: string;

  constructor(
    message: string,
    lineNumber: number | null = null,
    column: number | null = null,
    context: string | null = null,
    expected: string | null = null,
    actual: string | null = null,
    meta: ErrorMeta & { value?: string | null; hint?: string } = {}
  ) {
    const resolvedContext = context ?? (typeof meta.context === 'string' ? meta.context : null);
    const rawValue = meta.value ?? null;
    const value = rawValue !== null && rawValue.length > 200
      ? rawValue.slice(0, 200) + '…'
      : rawValue;
    const hint = meta.hint;

    // Build detailed message
    let detailedMessage = message;

    if (lineNumber !== null) {
      detailedMessage += ` at line ${lineNumber}`;
      if (column !== null) {
        detailedMessage += `, column ${column}`;
      }
    }

    if (resolvedContext !== null) {
      detailedMessage += `\nContext: ${resolvedContext}`;
    }

    if (expected !== null && actual !== null) {
      detailedMessage += `\nExpected: ${expected}\nActual: ${actual}`;
    } else if (expected !== null) {
      detailedMessage += `\nExpected: ${expected}`;
    } else if (actual !== null) {
      detailedMessage += `\nActual: ${actual}`;
    }

    if (value !== null) {
      detailedMessage += `\nValue: ${JSON.stringify(value)}`;
    }

    if (hint) {
      detailedMessage += `\nHint: ${hint}`;
    }

    super(detailedMessage, 'PARSING_ERROR', {
      ...meta,
      context: resolvedContext ?? meta.context ?? null,
      hint,
    });
    this.name = 'ParsingError';
    this.lineNumber = lineNumber;
    this.column = column;
    this.context = resolvedContext ?? meta.context ?? null;
    this.expected = expected;
    this.actual = actual;
    this.value = value;
    this.originalMessage = message;
  }
  
  /**
   * Create a ParsingError for CSV format issues.
   */
  static csvFormat(
    message: string,
    lineNumber: number | null = null,
    column: number | null = null,
    rowContent: string | null = null,
    hint?: string
  ): ParsingError {
    let context: string | null = null;
    if (rowContent !== null) {
      context = `Row content: "${rowContent.substring(0, 100)}${rowContent.length > 100 ? '...' : ''}"`;
    }
    return new ParsingError(
      `CSV format error: ${message}`,
      lineNumber,
      column,
      context,
      null,
      null,
      { hint },
    );
  }

  /**
   * Create a ParsingError for field count mismatch.
   * The most common cause: an unquoted comma inside a cell. The hint
   * surfaces both the `repairRowShifts` opt-out and the quoting fix.
   */
  static fieldCountMismatch(
    expectedCount: number,
    actualCount: number,
    lineNumber: number | null = null,
    rowContent: string | null = null
  ): ParsingError {
    const hint = actualCount < expectedCount
      ? `try \`repairRowShifts: true\` to auto-fill missing trailing cells, or quote any cell value that contains the delimiter`
      : `the row has more fields than the header — check for an unquoted delimiter inside a cell value`;
    return new ParsingError(
      'Field count mismatch',
      lineNumber,
      null,
      rowContent ? `Row: "${rowContent.substring(0, 100)}${rowContent.length > 100 ? '...' : ''}"` : null,
      `${expectedCount} fields`,
      `${actualCount} fields`,
      { hint },
    );
  }

  /**
   * Create a ParsingError for unclosed quotes.
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
      content ? `Content: "${content}"` : null,
      null,
      null,
      {
        hint:
          'the parser scanned to end-of-input still inside a quoted field — '
          + 'a closing `"` may be missing, or a literal `"` in cell content '
          + 'was not escaped as `""`',
      },
    );
  }

  /**
   * Create a ParsingError for invalid delimiter.
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
      context,
      null,
      null,
      {
        hint:
          'delimiter must be a single character. Common choices: `,` `;` `\\t` `|`. '
          + 'For auto-detection, omit the option or set `autoDetect: true`.',
      },
    );
  }

  /**
   * Create a ParsingError for a cell value that the parser couldn't process
   * (e.g. fast-path engine bailout). Surfaces both the offending value and
   * a hint pointing at the most likely fallback config.
   */
  static cellValue(
    message: string,
    value: string,
    lineNumber: number | null = null,
    column: number | null = null,
    hint?: string
  ): ParsingError {
    return new ParsingError(
      message,
      lineNumber,
      column,
      null,
      null,
      null,
      { value, hint },
    );
  }

  /**
   * Create a ParsingError for fast-path engine bailout.
   */
  static fastPathBailout(reason: string, content: string | null = null): ParsingError {
    return new ParsingError(
      `Fast-path parser bailout: ${reason}`,
      null,
      null,
      content ? `Content snippet: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"` : null,
      null,
      null,
      {
        hint:
          'try `useFastPath: false` to fall back to the standard quote-aware parser. '
          + 'The standard parser handles edge cases (CRLF in quotes, escaped quotes, '
          + 'mismatched columns) more robustly at a small perf cost.',
      },
    );
  }
}

/**
 * Error for size/limit violations
 */
export class LimitError extends JtcsvError {
  limit: any;
  actual: any;
  
  constructor(message: string, limit: any, actual: any, meta: ErrorMeta = {}) {
    super(message, 'LIMIT_ERROR', meta);
    this.name = 'LimitError';
    this.limit = limit;
    this.actual = actual;
  }
}

/**
 * Error for configuration issues
 */
export class ConfigurationError extends JtcsvError {
  constructor(message: string, meta: ErrorMeta = {}) {
    super(message, 'CONFIGURATION_ERROR', meta);
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
    hint?: string;
    docs?: string;
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

  if (details.hint !== undefined) {
    message += `\nHint: ${details.hint}`;
  }

  if (details.docs !== undefined) {
    message += `\nDocs: ${details.docs}`;
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
    hint?: string;
    docs?: string;
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

  hint(text: string): this {
    this.details.hint = text;
    return this;
  }

  docs(link: string): this {
    this.details.docs = link;
    return this;
  }
  
  buildMessage(baseMessage: string): string {
    return createDetailedErrorMessage(baseMessage, this.details);
  }
  
  throwParsingError(baseMessage: string): never {
    const message = this.buildMessage(baseMessage);
    const meta: ErrorMeta = {
      hint: this.details.hint ?? this.details.suggestion,
      docs: this.details.docs,
      context: this.details.context
    };
    throw new ParsingError(
      message,
      this.details.lineNumber,
      this.details.column,
      this.details.context,
      this.details.expected,
      this.details.actual,
      meta
    );
  }
  
  throwValidationError(baseMessage: string): never {
    const message = this.buildMessage(baseMessage);
    throw new ValidationError(message, {
      hint: this.details.hint ?? this.details.suggestion,
      docs: this.details.docs,
      context: this.details.context
    });
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
