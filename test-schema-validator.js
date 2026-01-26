const { createSchemaValidators } = require('./src/utils/schema-validator');

// Test 1: Simple schema with string, number, boolean
console.log('Test 1: Simple schema validation');
const simpleSchema = {
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    age: { type: 'integer', minimum: 0, maximum: 150 },
    active: { type: 'boolean' }
  },
  required: ['name', 'age']
};

const simpleValidators = createSchemaValidators(simpleSchema);
console.log('Validators created:', Object.keys(simpleValidators));

// Test validation
console.log('\nValidating valid data:');
const validData = { name: 'John Doe', age: 30, active: true };
for (const [key, validator] of Object.entries(simpleValidators)) {
  const isValid = validator.validate(validData[key]);
  console.log(`  ${key}: ${isValid ? '✓' : '✗'}`);
}

console.log('\nValidating invalid data:');
const invalidData = { name: '', age: -5, active: 'yes' };
for (const [key, validator] of Object.entries(simpleValidators)) {
  const isValid = validator.validate(invalidData[key]);
  console.log(`  ${key}: ${isValid ? '✓' : '✗'}`);
}

// Test 2: Schema with date-time format
console.log('\n\nTest 2: Date-time format validation');
const dateSchema = {
  properties: {
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

const dateValidators = createSchemaValidators(dateSchema);

console.log('\nValidating date strings:');
const dateData = {
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: new Date()
};
for (const [key, validator] of Object.entries(dateValidators)) {
  const isValid = validator.validate(dateData[key]);
  console.log(`  ${key}: ${isValid ? '✓' : '✗'}`);
  
  // Test formatting
  if (validator.format) {
    const formatted = validator.format(dateData[key]);
    console.log(`    Formatted: ${formatted}`);
  }
}

// Test 3: Schema with enum
console.log('\n\nTest 3: Enum validation');
const enumSchema = {
  properties: {
    status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
    priority: { type: 'integer', enum: [1, 2, 3, 4, 5] }
  }
};

const enumValidators = createSchemaValidators(enumSchema);

console.log('\nValidating enum values:');
const enumData = [
  { status: 'active', priority: 1 },
  { status: 'invalid', priority: 6 }
];

enumData.forEach((data, index) => {
  console.log(`\nData ${index + 1}:`);
  for (const [key, validator] of Object.entries(enumValidators)) {
    const isValid = validator.validate(data[key]);
    console.log(`  ${key}: ${isValid ? '✓' : '✗'} (value: ${data[key]})`);
  }
});

// Test 4: Schema with array
console.log('\n\nTest 4: Array validation');
const arraySchema = {
  properties: {
    tags: { type: 'array', minItems: 1, maxItems: 5 },
    scores: { type: 'array', items: { type: 'number', minimum: 0, maximum: 100 } }
  }
};

const arrayValidators = createSchemaValidators(arraySchema);

console.log('\nValidating arrays:');
const arrayData = {
  tags: ['javascript', 'nodejs', 'csv'],
  scores: [85, 92, 78, 101] // 101 is invalid
};

for (const [key, validator] of Object.entries(arrayValidators)) {
  const isValid = validator.validate(arrayData[key]);
  console.log(`  ${key}: ${isValid ? '✓' : '✗'}`);
}

// Test 5: Schema with nested object
console.log('\n\nTest 5: Nested object validation');
const nestedSchema = {
  properties: {
    user: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' }
      },
      required: ['id', 'name']
    }
  }
};

const nestedValidators = createSchemaValidators(nestedSchema);

console.log('\nValidating nested object:');
const nestedData = {
  user: {
    id: 123,
    name: 'Alice',
    email: 'alice@example.com'
  }
};

for (const [key, validator] of Object.entries(nestedValidators)) {
  const isValid = validator.validate(nestedData[key]);
  console.log(`  ${key}: ${isValid ? '✓' : '✗'}`);
}

console.log('\n\nAll tests completed!');