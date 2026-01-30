// Система ошибок для браузерной версии jtcsv
// Адаптирована для работы без Node.js специфичных API

/**
 * Детали ошибки
 */
export interface ErrorDetails {
  [key: string]: any;
  originalError?: Error;
  lineNumber?: number;
  limit?: any;
  actual?: any;
}

/**
 * Базовый класс ошибки jtcsv
 */
export class JTCSVError extends Error {
  code: string;
  details: ErrorDetails;

  constructor(message: string, code: string = 'JTCSV_ERROR', details: ErrorDetails = {}) {
    super(message);
    this.name = 'JTCSVError';
    this.code = code;
    this.details = details;
    
    // Сохранение stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, JTCSVError);
    }
  }
}

/**
 * Ошибка валидации
 */
export class ValidationError extends JTCSVError {
  constructor(message: string, details: ErrorDetails = {}) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Ошибка безопасности
 */
export class SecurityError extends JTCSVError {
  constructor(message: string, details: ErrorDetails = {}) {
    super(message, 'SECURITY_ERROR', details);
    this.name = 'SecurityError';
  }
}

/**
 * Ошибка файловой системы (адаптирована для браузера)
 */
export class FileSystemError extends JTCSVError {
  constructor(message: string, originalError?: Error, details: ErrorDetails = {}) {
    super(message, 'FILE_SYSTEM_ERROR', { ...details, originalError });
    this.name = 'FileSystemError';
    
    if (originalError && (originalError as any).code) {
      this.code = (originalError as any).code;
    }
  }
}

/**
 * Ошибка парсинга
 */
export class ParsingError extends JTCSVError {
  lineNumber?: number;

  constructor(message: string, lineNumber?: number, details: ErrorDetails = {}) {
    super(message, 'PARSING_ERROR', { ...details, lineNumber });
    this.name = 'ParsingError';
    this.lineNumber = lineNumber;
  }
}

/**
 * Ошибка превышения лимита
 */
export class LimitError extends JTCSVError {
  limit: any;
  actual: any;

  constructor(message: string, limit: any, actual: any, details: ErrorDetails = {}) {
    super(message, 'LIMIT_ERROR', { ...details, limit, actual });
    this.name = 'LimitError';
    this.limit = limit;
    this.actual = actual;
  }
}

/**
 * Ошибка конфигурации
 */
export class ConfigurationError extends JTCSVError {
  constructor(message: string, details: ErrorDetails = {}) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

/**
 * Коды ошибок
 */
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
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Безопасное выполнение функции с обработкой ошибок
 * 
 * @param fn - Функция для выполнения
 * @param errorCode - Код ошибки по умолчанию
 * @param errorDetails - Детали ошибки
 * @returns Результат выполнения функции
 */
export function safeExecute<T>(
  fn: () => T,
  errorCode: ErrorCode = 'UNKNOWN_ERROR',
  errorDetails: ErrorDetails = {}
): T {
  try {
    if (typeof fn === 'function') {
      return fn();
    }
    throw new ValidationError('Function expected');
  } catch (error) {
    // Если ошибка уже является JTCSVError, перебросить её
    if (error instanceof JTCSVError) {
      throw error;
    }
    
    // Определить тип ошибки на основе сообщения или кода
    let enhancedError: JTCSVError;
    const errorMessage = (error as Error).message || String(error);
    
    if (errorMessage.includes('validation') || errorMessage.includes('Validation')) {
      enhancedError = new ValidationError(errorMessage, { ...errorDetails, originalError: error as Error });
    } else if (errorMessage.includes('security') || errorMessage.includes('Security')) {
      enhancedError = new SecurityError(errorMessage, { ...errorDetails, originalError: error as Error });
    } else if (errorMessage.includes('parsing') || errorMessage.includes('Parsing')) {
      enhancedError = new ParsingError(errorMessage, undefined, { ...errorDetails, originalError: error as Error });
    } else if (errorMessage.includes('limit') || errorMessage.includes('Limit')) {
      enhancedError = new LimitError(errorMessage, null, null, { ...errorDetails, originalError: error as Error });
    } else if (errorMessage.includes('configuration') || errorMessage.includes('Configuration')) {
      enhancedError = new ConfigurationError(errorMessage, { ...errorDetails, originalError: error as Error });
    } else if (errorMessage.includes('file') || errorMessage.includes('File')) {
      enhancedError = new FileSystemError(errorMessage, error as Error, errorDetails);
    } else {
      // Общая ошибка
      enhancedError = new JTCSVError(errorMessage, errorCode, { ...errorDetails, originalError: error as Error });
    }
    
    // Сохранить оригинальный stack trace если возможно
    if ((error as Error).stack) {
      enhancedError.stack = (error as Error).stack;
    }
    
    throw enhancedError;
  }
}

/**
 * Асинхронная версия safeExecute
 */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T> | T,
  errorCode: ErrorCode = 'UNKNOWN_ERROR',
  errorDetails: ErrorDetails = {}
): Promise<T> {
  try {
    if (typeof fn === 'function') {
      return await fn();
    }
    throw new ValidationError('Function expected');
  } catch (error) {
    // Если ошибка уже является JTCSVError, перебросить её
    if (error instanceof JTCSVError) {
      throw error;
    }
    
    // Определить тип ошибки
    let enhancedError: JTCSVError;
    const errorMessage = (error as Error).message || String(error);
    
    if (errorMessage.includes('validation') || errorMessage.includes('Validation')) {
      enhancedError = new ValidationError(errorMessage, { ...errorDetails, originalError: error as Error });
    } else if (errorMessage.includes('security') || errorMessage.includes('Security')) {
      enhancedError = new SecurityError(errorMessage, { ...errorDetails, originalError: error as Error });
    } else if (errorMessage.includes('parsing') || errorMessage.includes('Parsing')) {
      enhancedError = new ParsingError(errorMessage, undefined, { ...errorDetails, originalError: error as Error });
    } else if (errorMessage.includes('limit') || errorMessage.includes('Limit')) {
      enhancedError = new LimitError(errorMessage, null, null, { ...errorDetails, originalError: error as Error });
    } else if (errorMessage.includes('configuration') || errorMessage.includes('Configuration')) {
      enhancedError = new ConfigurationError(errorMessage, { ...errorDetails, originalError: error as Error });
    } else if (errorMessage.includes('file') || errorMessage.includes('File')) {
      enhancedError = new FileSystemError(errorMessage, error as Error, errorDetails);
    } else {
      enhancedError = new JTCSVError(errorMessage, errorCode, { ...errorDetails, originalError: error as Error });
    }
    
    if ((error as Error).stack) {
      enhancedError.stack = (error as Error).stack;
    }
    
    throw enhancedError;
  }
}

/**
 * Создать сообщение об ошибке
 */
export function createErrorMessage(
  error: Error | JTCSVError,
  includeStack: boolean = false
): string {
  let message = error.message || 'Unknown error';
  
  if (error instanceof JTCSVError) {
    message = `[${error.code}] ${message}`;
    
    if (error instanceof ParsingError && error.lineNumber) {
      message += ` (line ${error.lineNumber})`;
    }
    
    if (error instanceof LimitError && error.limit && error.actual) {
      message += ` (limit: ${error.limit}, actual: ${error.actual})`;
    }
  }
  
  if (includeStack && error.stack) {
    message += `\n${error.stack}`;
  }
  
  return message;
}

/**
 * Обработка ошибки
 */
export function handleError(
  error: Error | JTCSVError,
  options: {
    log?: boolean;
    throw?: boolean;
    format?: boolean;
  } = {}
): string {
  const { log = true, throw: shouldThrow = false, format = true } = options;
  const message = format ? createErrorMessage(error) : error.message;
  
  if (log) {
    console.error(`[jtcsv] ${message}`);
    
    if (error instanceof JTCSVError && error.details) {
      console.error('Error details:', error.details);
    }
  }
  
  if (shouldThrow) {
    throw error;
  }
  
  return message;
}

// Экспорт для Node.js совместимости
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    JTCSVError,
    ValidationError,
    SecurityError,
    FileSystemError,
    ParsingError,
    LimitError,
    ConfigurationError,
    ERROR_CODES,
    safeExecute,
    safeExecuteAsync,
    createErrorMessage,
    handleError
  };
}