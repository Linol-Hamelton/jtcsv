/**
 * TypeScript definitions для JTCSV Validator
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

declare module '@jtcsv/validator' {
  export interface ValidationRule {
    type?: string | string[];
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    validate?: (value: any, row: any, rowIndex: number) => boolean | string;
  }

  export interface ValidationError {
    row: number;
    type: string;
    field?: string;
    rule?: string;
    message: string;
    value?: any;
    expected?: any;
    min?: number;
    max?: number;
    pattern?: string;
    allowed?: any[];
  }

  export interface ValidationWarning {
    row: number;
    type: string;
    field?: string;
    message: string;
    value?: any;
  }

  export interface ValidationSummary {
    totalRows: number;
    validRows: number;
    errorCount: number;
    warningCount: number;
    errorRate: number;
  }

  export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    data: any[];
    summary: ValidationSummary;
    analysis?: {
      errorTypes: Record<string, number>;
      fieldErrors: Record<string, number>;
      mostCommonError?: [string, number];
      mostProblematicField?: [string, number];
    };
    recommendations?: string[];
  }

  export interface ValidationOptions {
    stopOnFirstError?: boolean;
    includeWarnings?: boolean;
    transform?: boolean;
    csvOptions?: any;
    validationOptions?: any;
  }

  export interface JSONSchema {
    fields: Record<string, ValidationRule>;
    rules?: Array<{
      type: 'custom' | 'row';
      name: string;
      validator: string;
    }>;
    transformers?: Array<{
      field: string;
      transformer: string;
    }>;
  }

  export class JtcsvValidator {
    constructor();
    
    field(field: string, rule: ValidationRule): JtcsvValidator;
    schema(schema: Record<string, ValidationRule>): JtcsvValidator;
    custom(name: string, validator: (row: any, index: number) => boolean | string): JtcsvValidator;
    row(name: string, validator: (row: any, index: number) => boolean | string): JtcsvValidator;
    transform(field: string, transformer: (value: any, row: any, index: number) => any): JtcsvValidator;
    
    validate(data: any[], options?: ValidationOptions): ValidationResult;
    filterValid(data: any[]): any[];
    getErrors(data: any[]): ValidationError[];
    report(data: any[]): ValidationResult;
    reset(): JtcsvValidator;
    
    validateCsv(csv: string, options?: ValidationOptions): Promise<ValidationResult>;
    validateJsonString(jsonString: string, options?: ValidationOptions): ValidationResult;
    
    toJSON(): JSONSchema;
    static fromJSON(jsonSchema: JSONSchema): JtcsvValidator;
    static expressMiddleware(options?: any): any;
    static createJtcsvPlugin(): any;
    
    static schemas: {
      user: () => JtcsvValidator;
      product: () => JtcsvValidator;
      order: () => JtcsvValidator;
    };
  }

  export const createValidator: (schema?: Record<string, ValidationRule>) => JtcsvValidator;
  export const validateCsv: (csv: string, schema?: Record<string, ValidationRule>, options?: ValidationOptions) => Promise<ValidationResult>;
  export const validateJson: (json: any[], schema?: Record<string, ValidationRule>, options?: ValidationOptions) => ValidationResult;
  export const schemas: typeof JtcsvValidator.schemas;
  export const expressMiddleware: typeof JtcsvValidator.expressMiddleware;
  export const jtcsvPlugin: any;
}

export {};