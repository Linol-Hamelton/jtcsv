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
  constructor(message, lineNumber = null, column = null) {
    super(message, 'PARSING_ERROR');
    this.name = 'ParsingError';
    this.lineNumber = lineNumber;
    this.column = column;
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
  handleError,
  safeExecute,
  safeExecuteAsync,
  safeExecuteSync
};
