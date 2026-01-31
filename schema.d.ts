export interface SchemaRule {
  type?: string | string[];
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string | RegExp;
  enum?: any[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  items?: SchemaRule;
  properties?: Record<string, SchemaRule>;
  format?: string;
}

export interface Schema extends Record<string, any> {
  properties?: Record<string, SchemaRule>;
  required?: string[];
}

export interface ValidationErrorItem {
  row: number;
  type: string;
  field: string;
  message: string;
  value?: any;
  expected?: any;
  min?: number;
  max?: number;
  pattern?: string;
  allowed?: any[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorItem[];
  warnings: any[];
  summary: {
    totalRows: number;
    validRows: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface ApplySchemaValidationResult {
  valid: boolean;
  errors: Array<{ row: number; message: string; data: any }>;
  data: any[];
  summary: {
    totalRows: number;
    validRows: number;
    errorCount: number;
    errorRate: number;
  };
}

export interface Validator {
  validate(data: any[], options?: { stopOnFirstError?: boolean; transform?: boolean }): ValidationResult;
  schema?(schema: any): void;
  field?(field: string, rule: any): void;
}

export function loadSchema(schemaPathOrJson: string): Schema;
export function loadSchemaAsync(schemaPathOrJson: string): Promise<Schema>;
export function createValidationHook(
  schema: string | Schema
): (row: any, index: number, context: any) => any;
export function createAsyncValidationHook(
  schema: string | Schema
): (row: any, index: number, context: any) => Promise<unknown>;
export function applySchemaValidation(
  data: any[],
  schema: string | Schema
): ApplySchemaValidationResult;
export function applySchemaValidationAsync(
  data: any[],
  schema: string | Schema
): Promise<ApplySchemaValidationResult>;
export function createValidationHooks(schema: Schema): any;
export function checkType(value: any, rule: SchemaRule): boolean;
export function createSchemaValidators(schema: Schema): Record<string, any>;

declare const schemaValidator: {
  loadSchema: typeof loadSchema;
  loadSchemaAsync: typeof loadSchemaAsync;
  createValidationHook: typeof createValidationHook;
  createAsyncValidationHook: typeof createAsyncValidationHook;
  applySchemaValidation: typeof applySchemaValidation;
  applySchemaValidationAsync: typeof applySchemaValidationAsync;
  createValidationHooks: typeof createValidationHooks;
  checkType: typeof checkType;
  createSchemaValidators: typeof createSchemaValidators;
};

export default schemaValidator;
