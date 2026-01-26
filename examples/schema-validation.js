/**
 * Schema Validation Examples for jtcsv
 *
 * jtcsv supports JSON Schema validation for ensuring
 * data integrity during CSV/JSON conversions.
 */

const {
  jsonToCsv,
  csvToJson,
  ValidationError
} = require('jtcsv');

// =============================================================================
// Example 1: Basic Schema Validation
// =============================================================================

function basicSchemaValidation() {
  console.log('\n=== Basic Schema Validation ===\n');

  // Define schema for user data
  const userSchema = {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      email: {
        type: 'string',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
      },
      age: {
        type: 'number',
        minimum: 0,
        maximum: 150
      }
    }
  };

  // Valid data
  const validUsers = [
    { name: 'John Doe', email: 'john@example.com', age: 30 },
    { name: 'Jane Smith', email: 'jane@test.org', age: 25 }
  ];

  try {
    const csv = jsonToCsv(validUsers, { schema: userSchema });
    console.log('Valid data converted successfully:');
    console.log(csv);
  } catch (error) {
    console.log('Unexpected error:', error.message);
  }

  // Invalid data
  const invalidUsers = [
    { name: '', email: 'john@example.com', age: 30 },  // Empty name
    { name: 'Jane', email: 'invalid-email', age: -5 }  // Bad email, negative age
  ];

  try {
    jsonToCsv(invalidUsers, { schema: userSchema });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log('\nValidation failed (expected):');
      console.log('Error:', error.message);
    }
  }
}

// =============================================================================
// Example 2: Complex Nested Schema
// =============================================================================

function nestedSchemaValidation() {
  console.log('\n=== Nested Schema Validation ===\n');

  const orderSchema = {
    type: 'object',
    required: ['orderId', 'customer', 'total'],
    properties: {
      orderId: {
        type: 'string',
        pattern: '^ORD-[0-9]{6}$'  // Format: ORD-123456
      },
      customer: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string' }
        }
      },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['sku', 'quantity'],
          properties: {
            sku: { type: 'string' },
            quantity: { type: 'number', minimum: 1 }
          }
        }
      },
      total: {
        type: 'number',
        minimum: 0
      },
      status: {
        type: 'string',
        enum: ['pending', 'processing', 'shipped', 'delivered']
      }
    }
  };

  const orders = [
    {
      orderId: 'ORD-123456',
      customer: { name: 'John Doe', email: 'john@example.com' },
      items: [
        { sku: 'PROD-001', quantity: 2 },
        { sku: 'PROD-002', quantity: 1 }
      ],
      total: 149.99,
      status: 'processing'
    }
  ];

  try {
    const csv = jsonToCsv(orders, {
      schema: orderSchema,
      delimiter: ','
    });
    console.log('Order with nested data converted:');
    console.log(csv);
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// =============================================================================
// Example 3: Schema with Custom Formats
// =============================================================================

function customFormatSchema() {
  console.log('\n=== Custom Format Schema ===\n');

  const eventSchema = {
    type: 'object',
    required: ['eventId', 'timestamp', 'eventType'],
    properties: {
      eventId: {
        type: 'string',
        pattern: '^EVT-[A-Z0-9]{8}$'  // EVT-XXXXXXXX
      },
      timestamp: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$'  // ISO 8601
      },
      eventType: {
        type: 'string',
        enum: ['click', 'view', 'purchase', 'signup', 'login', 'logout']
      },
      userId: {
        type: 'string',
        pattern: '^USR-\\d{6}$'  // Optional but must match if present
      },
      metadata: {
        type: 'object'  // Allow any object structure
      }
    }
  };

  const events = [
    {
      eventId: 'EVT-A1B2C3D4',
      timestamp: '2024-01-15T10:30:00.123Z',
      eventType: 'purchase',
      userId: 'USR-000123',
      metadata: { productId: 'PRD-001', amount: 99.99 }
    },
    {
      eventId: 'EVT-E5F6G7H8',
      timestamp: '2024-01-15T10:31:00Z',
      eventType: 'view',
      metadata: { page: '/products', duration: 45 }
    }
  ];

  try {
    const csv = jsonToCsv(events, { schema: eventSchema });
    console.log('Events validated and converted:');
    console.log(csv);
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// =============================================================================
// Example 4: Array Validation
// =============================================================================

function arraySchemaValidation() {
  console.log('\n=== Array Schema Validation ===\n');

  const surveySchema = {
    type: 'object',
    required: ['respondentId', 'answers'],
    properties: {
      respondentId: {
        type: 'number',
        minimum: 1
      },
      answers: {
        type: 'array',
        minItems: 5,
        maxItems: 10,
        items: {
          type: 'number',
          minimum: 1,
          maximum: 5  // Rating 1-5
        }
      },
      comments: {
        type: 'string',
        maxLength: 500
      }
    }
  };

  const surveyResponses = [
    {
      respondentId: 1,
      answers: [5, 4, 3, 5, 4],
      comments: 'Great experience!'
    },
    {
      respondentId: 2,
      answers: [3, 3, 4, 4, 5, 4],
      comments: ''
    }
  ];

  try {
    const csv = jsonToCsv(surveyResponses, { schema: surveySchema });
    console.log('Survey responses validated:');
    console.log(csv);
  } catch (error) {
    console.log('Error:', error.message);
  }

  // Test with invalid data
  console.log('\nTesting invalid survey data:');
  const invalidSurvey = [
    {
      respondentId: 1,
      answers: [5, 4, 6, 5, 4],  // 6 is out of range (max 5)
      comments: 'Test'
    }
  ];

  try {
    jsonToCsv(invalidSurvey, { schema: surveySchema });
  } catch (error) {
    console.log('Validation error (expected):', error.message);
  }
}

// =============================================================================
// Example 5: Conditional Schema (oneOf/anyOf)
// =============================================================================

function conditionalSchema() {
  console.log('\n=== Conditional Schema ===\n');

  // Schema where payment method determines required fields
  const paymentSchema = {
    type: 'object',
    required: ['paymentId', 'method', 'amount'],
    properties: {
      paymentId: { type: 'string' },
      method: {
        type: 'string',
        enum: ['credit_card', 'bank_transfer', 'crypto']
      },
      amount: {
        type: 'number',
        minimum: 0.01
      },
      // Credit card fields
      cardLast4: {
        type: 'string',
        pattern: '^\\d{4}$'
      },
      // Bank transfer fields
      bankAccount: {
        type: 'string'
      },
      // Crypto fields
      walletAddress: {
        type: 'string',
        pattern: '^0x[a-fA-F0-9]{40}$'
      }
    }
  };

  const payments = [
    {
      paymentId: 'PAY-001',
      method: 'credit_card',
      amount: 99.99,
      cardLast4: '1234'
    },
    {
      paymentId: 'PAY-002',
      method: 'bank_transfer',
      amount: 500.00,
      bankAccount: 'GB82WEST12345698765432'
    },
    {
      paymentId: 'PAY-003',
      method: 'crypto',
      amount: 250.00,
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8e21d'
    }
  ];

  try {
    const csv = jsonToCsv(payments, { schema: paymentSchema });
    console.log('Payments validated:');
    console.log(csv);
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// =============================================================================
// Example 6: Schema for Type Coercion Hints
// =============================================================================

function typeCoercionSchema() {
  console.log('\n=== Schema for Type Hints ===\n');

  // Schema that helps with proper type handling
  const productSchema = {
    type: 'object',
    properties: {
      sku: { type: 'string' },
      name: { type: 'string' },
      price: { type: 'number' },
      quantity: { type: 'integer' },
      isAvailable: { type: 'boolean' },
      tags: {
        type: 'array',
        items: { type: 'string' }
      },
      dimensions: {
        type: 'object',
        properties: {
          width: { type: 'number' },
          height: { type: 'number' },
          depth: { type: 'number' }
        }
      }
    }
  };

  const products = [
    {
      sku: 'LAPTOP-001',
      name: 'Pro Laptop 15"',
      price: 1299.99,
      quantity: 50,
      isAvailable: true,
      tags: ['electronics', 'computers', 'portable'],
      dimensions: { width: 35.5, height: 1.8, depth: 24.0 }
    }
  ];

  const csv = jsonToCsv(products, {
    schema: productSchema,
    delimiter: ','
  });
  console.log('Product with type hints:');
  console.log(csv);
}

// =============================================================================
// Example 7: Validation Error Details
// =============================================================================

function validationErrorDetails() {
  console.log('\n=== Validation Error Details ===\n');

  const strictSchema = {
    type: 'object',
    additionalProperties: false,  // No extra fields allowed
    required: ['id', 'name', 'email', 'role'],
    properties: {
      id: {
        type: 'integer',
        minimum: 1
      },
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 50
      },
      email: {
        type: 'string',
        pattern: '^[^@]+@[^@]+\\.[^@]+$'
      },
      role: {
        type: 'string',
        enum: ['admin', 'user', 'guest']
      }
    }
  };

  // Data with multiple validation errors
  const invalidData = [
    {
      id: 0,             // Error: minimum is 1
      name: 'A',         // Error: minLength is 2
      email: 'invalid',  // Error: doesn't match pattern
      role: 'superuser', // Error: not in enum
      extra: 'field'     // Error: additionalProperties false
    }
  ];

  try {
    jsonToCsv(invalidData, { schema: strictSchema });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log('Multiple validation errors detected:');
      console.log('Message:', error.message);
      console.log('Code:', error.code);
    }
  }
}

// =============================================================================
// Example 8: Schema Validation with CSV Input
// =============================================================================

function schemaValidationOnCsvInput() {
  console.log('\n=== Schema Validation on CSV Input ===\n');

  const csv = `id,name,score,passed
1,Alice,95,true
2,Bob,87,true
3,Charlie,45,false
4,Diana,invalid,true`;  // 'invalid' should be a number

  // First parse CSV
  const data = csvToJson(csv, {
    parseNumbers: true,
    parseBooleans: true
  });

  console.log('Parsed data:');
  data.forEach(row => {
    console.log(`  ${row.name}: score=${row.score} (${typeof row.score})`);
  });

  // Now validate
  const scoreSchema = {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      score: { type: 'number', minimum: 0, maximum: 100 },
      passed: { type: 'boolean' }
    }
  };

  // Validate each row
  console.log('\nValidation results:');
  data.forEach((row, i) => {
    const isValid = typeof row.score === 'number' &&
      row.score >= 0 && row.score <= 100;
    console.log(`  Row ${i + 1} (${row.name}): ${isValid ? 'Valid' : 'Invalid'}`);
  });
}

// =============================================================================
// Example 9: Reusable Schema Definitions
// =============================================================================

function reusableSchemaDefinitions() {
  console.log('\n=== Reusable Schema Definitions ===\n');

  // Common field definitions
  const commonFields = {
    id: { type: 'integer', minimum: 1 },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' }
  };

  const addressSchema = {
    type: 'object',
    required: ['street', 'city', 'country'],
    properties: {
      street: { type: 'string' },
      city: { type: 'string' },
      postalCode: { type: 'string' },
      country: { type: 'string', minLength: 2, maxLength: 2 }  // ISO country code
    }
  };

  // Customer schema using common fields
  const customerSchema = {
    type: 'object',
    required: ['id', 'name', 'email'],
    properties: {
      ...commonFields,
      name: { type: 'string', minLength: 1 },
      email: { type: 'string' },
      phone: { type: 'string' },
      billingAddress: addressSchema,
      shippingAddress: addressSchema
    }
  };

  const customers = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-1234',
      billingAddress: {
        street: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        country: 'US'
      },
      shippingAddress: {
        street: '456 Oak Ave',
        city: 'Brooklyn',
        postalCode: '11201',
        country: 'US'
      },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    }
  ];

  try {
    const csv = jsonToCsv(customers, { schema: customerSchema });
    console.log('Customer data validated with reusable schema:');
    console.log(csv);
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// =============================================================================
// Example 10: Schema Factory Pattern
// =============================================================================

function schemaFactoryPattern() {
  console.log('\n=== Schema Factory Pattern ===\n');

  // Schema factory for different entity types
  const createEntitySchema = (entityType, customProperties = {}) => ({
    type: 'object',
    required: ['id', 'type', 'name'],
    properties: {
      id: { type: 'integer', minimum: 1 },
      type: { type: 'string', enum: [entityType] },
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      active: { type: 'boolean' },
      metadata: { type: 'object' },
      ...customProperties
    }
  });

  // Create specific schemas
  const productSchema = createEntitySchema('product', {
    price: { type: 'number', minimum: 0 },
    sku: { type: 'string', pattern: '^[A-Z]{3}-\\d{4}$' },
    category: { type: 'string' }
  });

  const serviceSchema = createEntitySchema('service', {
    hourlyRate: { type: 'number', minimum: 0 },
    duration: { type: 'integer', minimum: 1 },
    availability: { type: 'string', enum: ['available', 'busy', 'unavailable'] }
  });

  console.log('Product schema created:', Object.keys(productSchema.properties));
  console.log('Service schema created:', Object.keys(serviceSchema.properties));

  // Validate data
  const product = {
    id: 1,
    type: 'product',
    name: 'Widget Pro',
    price: 29.99,
    sku: 'WGT-0001',
    category: 'widgets',
    active: true
  };

  try {
    const csv = jsonToCsv([product], { schema: productSchema });
    console.log('\nProduct validated successfully');
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// =============================================================================
// Run All Examples
// =============================================================================

async function main() {
  console.log('jtcsv Schema Validation Examples');
  console.log('='.repeat(60));

  basicSchemaValidation();
  nestedSchemaValidation();
  customFormatSchema();
  arraySchemaValidation();
  conditionalSchema();
  typeCoercionSchema();
  validationErrorDetails();
  schemaValidationOnCsvInput();
  reusableSchemaDefinitions();
  schemaFactoryPattern();

  console.log('\n' + '='.repeat(60));
  console.log('All schema validation examples completed.');
}

main().catch(console.error);
