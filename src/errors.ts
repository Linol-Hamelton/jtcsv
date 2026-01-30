export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class FileSystemError extends Error {
  cause?: Error;
  
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'FileSystemError';
    if (cause) {
      this.cause = cause;
    }
  }
}

export class LimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LimitError';
  }
}

export class ParsingError extends Error {
  lineNumber?: number;
  
  constructor(message: string, lineNumber?: number) {
    super(message);
    this.name = 'ParsingError';
    if (lineNumber !== undefined) {
      this.lineNumber = lineNumber;
    }
  }
}

export class JtcsvError extends Error {
  code?: string;
  
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'JtcsvError';
    if (code) {
      this.code = code;
    }
  }
}

export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'SECURITY_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'FILE_SYSTEM_ERROR'
  | 'LIMIT_ERROR'
  | 'PARSING_ERROR'
  | 'UNKNOWN_ERROR';