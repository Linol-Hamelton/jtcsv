// Система ошибок для браузерной версии jtcsv
// Адаптирована для работы без Node.js специфичных API

/**
 * Базовый класс ошибки jtcsv
 */
export class JTCSVError extends Error {
  constructor(message, code = 'JTCSV_ERROR', details = {}) {
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
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Ошибка безопасности
 */
export class SecurityError extends JTCSVError {
  constructor(message, details = {}) {
    super(message, 'SECURITY_ERROR', details);
    this.name = 'SecurityError';
  }
}

/**
 * Ошибка файловой системы (адаптирована для браузера)
 */
export class FileSystemError extends JTCSVError {
  constructor(message, originalError = null, details = {}) {
    super(message, 'FILE_SYSTEM_ERROR', { ...details, originalError });
    this.name = 'FileSystemError';
    
    if (originalError && originalError.code) {
      this.code = originalError.code;
    }
  }
}

/**
 * Ошибка парсинга
 */
export class ParsingError extends JTCSVError {
  constructor(message, lineNumber = null, details = {}) {
    super(message, 'PARSING_ERROR', { ...details, lineNumber });
    this.name = 'ParsingError';
    this.lineNumber = lineNumber;
  }
}

/**
 * Ошибка превышения лимита
 */
export class LimitError extends JTCSVError {
  constructor(message, limit, actual, details = {}) {
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
  constructor(message, details = {}) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

/**
 * Безопасное выполнение функции с обработкой ошибок
 * 
 * @param {Function} fn - Функция для выполнения
 * @param {string} errorCode - Код ошибки по умолчанию
 * @param {Object} errorDetails - Детали ошибки
 * @returns {*} Результат выполнения функции
 */
export function safeExecute(fn, errorCode = 'UNKNOWN_ERROR', errorDetails = {}) {
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
    let enhancedError;
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes('validation') || errorMessage.includes('Validation')) {
      enhancedError = new ValidationError(errorMessage, { ...errorDetails, originalError: error });
    } else if (errorMessage.includes('security') || errorMessage.includes('Security')) {
      enhancedError = new SecurityError(errorMessage, { ...errorDetails, originalError: error });
    } else if (errorMessage.includes('parsing') || errorMessage.includes('Parsing')) {
      enhancedError = new ParsingError(errorMessage, null, { ...errorDetails, originalError: error });
    } else if (errorMessage.includes('limit') || errorMessage.includes('Limit')) {
      enhancedError = new LimitError(errorMessage, null, null, { ...errorDetails, originalError: error });
    } else if (errorMessage.includes('configuration') || errorMessage.includes('Configuration')) {
      enhancedError = new ConfigurationError(errorMessage, { ...errorDetails, originalError: error });
    } else if (errorMessage.includes('file') || errorMessage.includes('File')) {
      enhancedError = new FileSystemError(errorMessage, error, errorDetails);
    } else {
      // Общая ошибка
      enhancedError = new JTCSVError(errorMessage, errorCode, { ...errorDetails, originalError: error });
    }
    
    // Сохранить оригинальный stack trace если возможно
    if (error.stack) {
      enhancedError.stack = error.stack;
    }
    
    throw enhancedError;
  }
}

/**
 * Асинхронная версия safeExecute
 */
export async function safeExecuteAsync(fn, errorCode = 'UNKNOWN_ERROR', errorDetails = {}) {
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
    let enhancedError;
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes('validation') || errorMessage.includes('Validation')) {
      enhancedError = new ValidationError(errorMessage, { ...errorDetails, originalError: error });
    } else if (errorMessage.includes('security') || errorMessage.includes('Security')) {
      enhancedError = new SecurityError(errorMessage, { ...errorDetails, originalError: error });
    } else if (errorMessage.includes('parsing') || errorMessage.includes('Parsing')) {
      enhancedError = new ParsingError(errorMessage, null, { ...errorDetails, originalError: error });
    } else if (errorMessage.includes('limit') || errorMessage.includes('Limit')) {
      enhancedError = new LimitError(errorMessage, null, null, { ...errorDetails, originalError: error });
    } else if (errorMessage.includes('configuration') || errorMessage.includes('Configuration')) {
      enhancedError = new ConfigurationError(errorMessage, { ...errorDetails, originalError: error });
    } else if (errorMessage.includes('file') || errorMessage.includes('File')) {
      enhancedError = new FileSystemError(errorMessage, error, errorDetails);
    } else {
      enhancedError = new JTCSVError(errorMessage, errorCode, { ...errorDetails, originalError: error });
    }
    
    if (error.stack) {
      enhancedError.stack = error.stack;
    }
    
    throw enhancedError;
  }
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
    safeExecute,
    safeExecuteAsync
  };
}