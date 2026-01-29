// @ts-nocheck
/**
 * Custom error classes for jtcsv
 */

/**
 * Base error class for jtcsv
 */
class JtcsvError extends Error {
  constructor(message, code = 'JTCSV_ERROR') {
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
class ValidationError extends JtcsvError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Error for security violations
 */
class SecurityError extends JtcsvError {
  constructor(message) {
    super(message, 'SECURITY_ERROR');
    this.name = 'SecurityError';
  }
}

/**
 * Error for file system operations
 */
class FileSystemError extends JtcsvError {
  constructor(message, originalError = null) {
    super(message, 'FILE_SYSTEM_ERROR');
    this.name = 'FileSystemError';
    this.originalError = originalError;
  }
}

/**
 * Error for parsing/formatting issues
 */
class ParsingError extends JtcsvError {
  constructor(message, lineNumber = null, column = null, context = null, expected = null, actual = null) {
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
  static csvFormat(message, lineNumber = null, column = null, rowContent = null) {
    let context = null;
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
  static fieldCountMismatch(expectedCount, actualCount, lineNumber = null, rowContent = null) {
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
  static unclosedQuotes(lineNumber = null, column = null, content = null) {
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
  static invalidDelimiter(delimiter, lineNumber = null, context = null) {
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
class LimitError extends JtcsvError {
  constructor(message, limit, actual) {
    super(message, 'LIMIT_ERROR');
    this.name = 'LimitError';
    this.limit = limit;
    this.actual = actual;
  }
}

/**
 * Error for configuration issues
 */
class ConfigurationError extends JtcsvError {
  constructor(message) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

/**
 * Utility function to create detailed error messages
 */
function createDetailedErrorMessage(baseMessage, details = {}) {
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
class ErrorContext {
  constructor() {
    this.details = {};
  }
  
  lineNumber(line) {
    this.details.lineNumber = line;
    return this;
  }
  
  column(col) {
    this.details.column = col;
    return this;
  }
  
  context(ctx) {
    this.details.context = ctx;
    return this;
  }
  
  expected(exp) {
    this.details.expected = exp;
    return this;
  }
  
  actual(act) {
    this.details.actual = act;
    return this;
  }
  
  suggestion(sugg) {
    this.details.suggestion = sugg;
    return this;
  }
  
  codeSnippet(snippet) {
    this.details.codeSnippet = snippet;
    return this;
  }
  
  buildMessage(baseMessage) {
    return createDetailedErrorMessage(baseMessage, this.details);
  }
  
  throwParsingError(baseMessage) {
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
  
  throwValidationError(baseMessage) {
    const message = this.buildMessage(baseMessage);
    throw new ValidationError(message);
  }
}

const ERROR_CODES = {
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
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Utility function to create standardized error messages
 */
function createErrorMessage(type, details) {
  const messages = {
    INVALID_INPUT: `Invalid input: ${details}`,
    SECURITY_VIOLATION: `Security violation: ${details}`,
    FILE_NOT_FOUND: `File not found: ${details}`,
    PARSE_FAILED: `Parse failed: ${details}`,
    SIZE_LIMIT: `Size limit exceeded: ${details}`,
    INVALID_CONFIG: `Invalid configuration: ${details}`,
    UNKNOWN_ERROR: `Unknown error: ${details}`
  };
  
  return messages[type] || messages.UNKNOWN_ERROR;
}

/**
 * Error handler utility
 */
/* istanbul ignore next */
function handleError(error, context = {}) {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[jtcsv] Error in ${context.function || 'unknown'}:`, {
      message: error.message,
      code: error.code,
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
async function safeExecuteAsync(fn, errorType, context = {}) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof JtcsvError) {
      throw error;
    }
    
    // Wrap unknown errors
    const message = createErrorMessage(errorType, error.message);
    const wrappedError = new JtcsvError(message, errorType);
    wrappedError.originalError = error;
    
    handleError(wrappedError, context);
  }
}

/**
 * Safe execution wrapper for sync functions
 */
function safeExecuteSync(fn, errorType, context = {}) {
  try {
    return fn();
  } catch (error) {
    if (error instanceof JtcsvError) {
      throw error;
    }
    
    // Wrap unknown errors
    const message = createErrorMessage(errorType, error.message);
    const wrappedError = new JtcsvError(message, errorType);
    wrappedError.originalError = error;
    
    handleError(wrappedError, context);
  }
}

/**
 * Safe execution wrapper (auto-detects async/sync)
 */
function safeExecute(fn, errorType, context = {}) {
  const result = fn();
  
  // Check if function returns a promise
  if (result && typeof result.then === 'function') {
    return safeExecuteAsync(async () => result, errorType, context);
  }
  
  return safeExecuteSync(() => result, errorType, context);
}

module.exports = {
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
  safeExecuteAsync,
  safeExecuteSync
};
