/**
 * Schema Validator Utility
 * 
 * Utility for loading and applying JSON schema validation in CLI
 */

const fs = require('fs');
const path = require('path');

const {
  ValidationError,
  SecurityError,
  ConfigurationError
} = require('../errors');

/**
 * Loads JSON schema from file or string
 * 
 * @param {string} schemaPathOrJson - Path to JSON file or JSON string
 * @returns {Object} Parsed JSON schema
 */
function loadSchema(schemaPathOrJson) {
  if (!schemaPathOrJson || typeof schemaPathOrJson !== 'string') {
    throw new ValidationError('Schema must be a string (JSON or file path)');
  }
  
  let schemaString = schemaPathOrJson;
  
  // Check if it's a file path (ends with .json or contains path separators)
  const isFilePath = schemaPathOrJson.endsWith('.json') || 
                     schemaPathOrJson.includes('/') || 
                     schemaPathOrJson.includes('\\');
  
  if (isFilePath) {
    // Validate file path
    const safePath = path.resolve(schemaPathOrJson);
    
    // Prevent directory traversal
    const normalizedPath = path.normalize(schemaPathOrJson);
    if (normalizedPath.includes('..') || 
        /\\\.\.\\|\/\.\.\//.test(schemaPathOrJson) ||
        schemaPathOrJson.startsWith('..') ||
        schemaPathOrJson.includes('/..')) {
      throw new SecurityError('Directory traversal detected in schema file path');
    }
    
    // Check file exists and has .json extension
    if (!fs.existsSync(safePath)) {
      throw new ValidationError(`Schema file not found: ${schemaPathOrJson}`);
    }
    
    if (!safePath.toLowerCase().endsWith('.json')) {
      throw new ValidationError('Schema file must have .json extension');
    }
    
    try {
      schemaString = fs.readFileSync(safePath, 'utf8');
    } catch (error) {
      if (error.code === 'EACCES') {
        throw new SecurityError(`Permission denied reading schema file: ${schemaPathOrJson}`);
      }
      throw new ValidationError(`Failed to read schema file: ${error.message}`);
    }
  }
  
  // Parse JSON schema
  try {
    const schema = JSON.parse(schemaString);
    
    // Validate basic schema structure
    if (typeof schema !== 'object' || schema === null) {
      throw new ValidationError('Schema must be a JSON object');
    }
    
    return schema;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ValidationError(`Invalid JSON in schema: ${error.message}`);
    }
    throw new ValidationError(`Failed to parse schema: ${error.message}`);
  }
}

/**
 * Creates a validation hook for use with csvToJson/jsonToCsv hooks system
 * 
 * @param {string|Object} schema - Schema object or path to schema file
 * @returns {Function} Validation hook function
 */
function createValidationHook(schema) {
  let schemaObj;
  
  if (typeof schema === 'string') {
    // Load schema from file or JSON string
    schemaObj = loadSchema(schema);
  } else if (typeof schema === 'object' && schema !== null) {
    // Use provided schema object
    schemaObj = schema;
  } else {
    throw new ValidationError('Schema must be an object or a path to a JSON file');
  }
  
  // Try to use @jtcsv/validator if available
  let validator;
  try {
    const JtcsvValidator = require('../../packages/jtcsv-validator/src/index');
    validator = new JtcsvValidator();
    
    // Convert simple schema format to validator format
    if (schemaObj.fields) {
      // Assume it's already in validator format
      validator.schema(schemaObj.fields);
    } else {
      // Convert simple field definitions
      Object.entries(schemaObj).forEach(([field, rule]) => {
        if (typeof rule === 'object') {
          validator.field(field, rule);
        }
      });
    }
  } catch (error) {
    // Fallback to simple validation if validator is not available
    console.warn('@jtcsv/validator not available, using simple validation');
    validator = createSimpleValidator(schemaObj);
  }
  
  // Return a hook function compatible with hooks.perRow
  return function(row, index, context) {
    try {
      const result = validator.validate([row], { 
        stopOnFirstError: true,
        transform: false 
      });
      
      if (!result.valid && result.errors.length > 0) {
        const error = result.errors[0];
        throw new ValidationError(
          `Row ${index + 1}: ${error.message} (field: ${error.field})`
        );
      }
      
      return row;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      // Log error but don't crash - return original row
      console.error(`Validation error at row ${index}: ${error.message}`);
      if (process.env.NODE_ENV === 'development') {
        console.error(error.stack);
      }
      return row;
    }
  };
}

/**
 * Creates a simple validator for fallback when @jtcsv/validator is not available
 * 
 * @private
 */
function createSimpleValidator(schema) {
  return {
    validate(data, options = {}) {
      const errors = [];
      const warnings = [];
      
      if (!Array.isArray(data)) {
        return {
          valid: false,
          errors: [{ type: 'INVALID_DATA', message: 'Data must be an array' }],
          warnings: [],
          summary: {
            totalRows: 0,
            validRows: 0,
            errorCount: 1,
            warningCount: 0
          }
        };
      }
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        for (const [field, rule] of Object.entries(schema)) {
          const value = row[field];
          
          // Check required
          if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push({
              row: i + 1,
              type: 'REQUIRED',
              field,
              message: `Field "${field}" is required`,
              value
            });
            continue;
          }
          
          // Skip further validation if value is empty and not required
          if (value === undefined || value === null || value === '') {
            continue;
          }
          
          // Check type
          if (rule.type) {
            const types = Array.isArray(rule.type) ? rule.type : [rule.type];
            let typeValid = false;
            
            for (const type of types) {
              if (checkType(value, type)) {
                typeValid = true;
                break;
              }
            }
            
            if (!typeValid) {
              errors.push({
                row: i + 1,
                type: 'TYPE',
                field,
                message: `Field "${field}" must be of type ${types.join(' or ')}`,
                value,
                expected: types
              });
            }
          }
          
          // Check min/max for strings
          if (rule.min !== undefined && typeof value === 'string' && value.length < rule.min) {
            errors.push({
              row: i + 1,
              type: 'MIN_LENGTH',
              field,
              message: `Field "${field}" must be at least ${rule.min} characters`,
              value,
              min: rule.min
            });
          }
          
          if (rule.max !== undefined && typeof value === 'string' && value.length > rule.max) {
            errors.push({
              row: i + 1,
              type: 'MAX_LENGTH',
              field,
              message: `Field "${field}" must be at most ${rule.max} characters`,
              value,
              max: rule.max
            });
          }
          
          // Check min/max for numbers
          if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
            errors.push({
              row: i + 1,
              type: 'MIN_VALUE',
              field,
              message: `Field "${field}" must be at least ${rule.min}`,
              value,
              min: rule.min
            });
          }
          
          if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
            errors.push({
              row: i + 1,
              type: 'MAX_VALUE',
              field,
              message: `Field "${field}" must be at most ${rule.max}`,
              value,
              max: rule.max
            });
          }
          
          // Check pattern
          if (rule.pattern && typeof value === 'string') {
            const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern);
            if (!pattern.test(value)) {
              errors.push({
                row: i + 1,
                type: 'PATTERN',
                field,
                message: `Field "${field}" must match pattern`,
                value,
                pattern: pattern.toString()
              });
            }
          }
          
          // Check enum
          if (rule.enum && Array.isArray(rule.enum) && !rule.enum.includes(value)) {
            errors.push({
              row: i + 1,
              type: 'ENUM',
              field,
              message: `Field "${field}" must be one of: ${rule.enum.join(', ')}`,
              value,
              allowed: rule.enum
            });
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        summary: {
          totalRows: data.length,
          validRows: data.length - errors.length,
          errorCount: errors.length,
          warningCount: warnings.length
        }
      };
    }
  };
}

/**
 * Checks if value matches type
 * 
 * @private
 */
function checkType(value, type) {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return Number.isInteger(value);
    case 'float':
      return typeof value === 'number' && !Number.isInteger(value);
    case 'date':
      return value instanceof Date && !isNaN(value);
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Applies schema validation to data array
 * 
 * @param {Array} data - Array of data to validate
 * @param {string|Object} schema - Schema object or path to schema file
 * @returns {Object} Validation result
 */
function applySchemaValidation(data, schema) {
  if (!Array.isArray(data)) {
    throw new ValidationError('Data must be an array');
  }
  
  const validationHook = createValidationHook(schema);
  const errors = [];
  const validatedData = [];
  
  for (let i = 0; i < data.length; i++) {
    try {
      const validatedRow = validationHook(data[i], i, { operation: 'validate' });
      validatedData.push(validatedRow);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push({
          row: i + 1,
          message: error.message,
          data: data[i]
        });
      } else {
        // Skip rows with non-validation errors
        validatedData.push(data[i]);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    data: validatedData,
    summary: {
      totalRows: data.length,
      validRows: validatedData.length,
      errorCount: errors.length,
      errorRate: data.length > 0 ? (errors.length / data.length) * 100 : 0
    }
  };
}

/**
 * Creates a TransformHooks instance with validation
 * 
 * @param {string|Object} schema - Schema object or path to schema file
 * @returns {Object} TransformHooks instance
 */
function createValidationHooks(schema) {
  const { TransformHooks } = require('../core/transform-hooks');
  const hooks = new TransformHooks();
  
  const validationHook = createValidationHook(schema);
  hooks.perRow(validationHook);
  
  return hooks;
}

/**
 * Creates schema validators from JSON schema
 *
 * @param {Object} schema - JSON schema
 * @returns {Object} Validators object
 */
function createSchemaValidators(schema) {
  const validators = {};

  // Handle both JSON Schema format and simple format
  const properties = schema.properties || schema;
  const requiredFields = schema.required || [];

  if (!properties || typeof properties !== 'object') {
    return validators;
  }

  for (const [key, definition] of Object.entries(properties)) {
    const validator = {
      type: definition.type,
      required: requiredFields.includes(key)
    };

    // Add format function for dates and other formats
    if (definition.type === 'string' && definition.format) {
      validator.format = (value) => {
        // Handle date-time format
        if (definition.format === 'date-time') {
          if (value instanceof Date) {
            return value.toISOString();
          }
          /* istanbul ignore next */
          if (typeof value === 'string') {
            // Try to parse as date
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          }
        }
        // Handle email format
        if (definition.format === 'email') {
          if (typeof value === 'string') {
            return value.toLowerCase().trim();
          }
        }
        // Handle uri format
        if (definition.format === 'uri') {
          if (typeof value === 'string') {
            return value.trim();
          }
        }
        return value;
      };
    }

    // Add validation function
    validator.validate = (value) => {
      if (value === null || value === undefined) {
        return !validator.required;
      }

      // Type validation
      if (definition.type === 'string' && typeof value !== 'string') {
        // For date-time format, also accept Date objects
        if (definition.format === 'date-time' && value instanceof Date) {
          return true;
        }
        return false;
      }
      if (definition.type === 'number' && typeof value !== 'number') {
        return false;
      }
      if (definition.type === 'integer' && (!Number.isInteger(value) || typeof value !== 'number')) {
        return false;
      }
      if (definition.type === 'boolean' && typeof value !== 'boolean') {
        return false;
      }
      if (definition.type === 'array' && !Array.isArray(value)) {
        return false;
      }
      if (definition.type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
        return false;
      }

      // Additional constraints for strings
      if (definition.type === 'string') {
        if (definition.minLength !== undefined && value.length < definition.minLength) {
          return false;
        }
        if (definition.maxLength !== undefined && value.length > definition.maxLength) {
          return false;
        }
        if (definition.pattern && !new RegExp(definition.pattern).test(value)) {
          return false;
        }
        if (definition.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return false;
        }
        if (definition.format === 'uri') {
          try {
            new URL(value);
          } catch {
            return false;
          }
        }
      }

      // Additional constraints for numbers
      if (definition.type === 'number' || definition.type === 'integer') {
        if (definition.minimum !== undefined && value < definition.minimum) {
          return false;
        }
        if (definition.maximum !== undefined && value > definition.maximum) {
          return false;
        }
        if (definition.exclusiveMinimum !== undefined && value <= definition.exclusiveMinimum) {
          return false;
        }
        if (definition.exclusiveMaximum !== undefined && value >= definition.exclusiveMaximum) {
          return false;
        }
        if (definition.multipleOf !== undefined && value % definition.multipleOf !== 0) {
          return false;
        }
      }

      // Additional constraints for arrays
      if (definition.type === 'array') {
        if (definition.minItems !== undefined && value.length < definition.minItems) {
          return false;
        }
        if (definition.maxItems !== undefined && value.length > definition.maxItems) {
          return false;
        }
        if (definition.uniqueItems && new Set(value).size !== value.length) {
          return false;
        }
        // Validate array items if schema is provided
        if (definition.items) {
          for (const item of value) {
            const itemValidator = createSchemaValidators({ properties: { item: definition.items } });
            if (itemValidator.item && !itemValidator.item.validate(item)) {
              return false;
            }
          }
        }
      }

      // Additional constraints for objects
      if (definition.type === 'object' && definition.properties) {
        const nestedValidators = createSchemaValidators(definition);
        for (const [nestedKey, nestedValidator] of Object.entries(nestedValidators)) {
          if (value[nestedKey] !== undefined && !nestedValidator.validate(value[nestedKey])) {
            return false;
          }
          if (nestedValidator.required && value[nestedKey] === undefined) {
            return false;
          }
        }
      }

      // Check enum
      if (definition.enum && !definition.enum.includes(value)) {
        return false;
      }

      return true;
    };

    validators[key] = validator;
  }

  return validators;
}

module.exports = {
  loadSchema,
  createValidationHook,
  applySchemaValidation,
  createValidationHooks,
  checkType,
  createSchemaValidators  // Add this line
};
