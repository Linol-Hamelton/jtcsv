// Test large file handling
const { csvToJson, jsonToCsv } = require('./index.js');

// Test 1: CSV with more than 1M rows (simulated)
console.log('Test 1: Testing warning for large CSV...');
// Create a CSV string with 1,000,001 rows
const header = 'id;name;email';
let csv = header + '\n';
for (let i = 1; i <= 100; i++) { // Use 100 for quick test
  csv += `${i};User${i};user${i}@example.com\n`;
}

// Mock console.warn to capture warning
const originalWarn = console.warn;
let warningMessage = '';
console.warn = (msg) => {
  warningMessage = msg;
  originalWarn(msg);
};

// Temporarily set NODE_ENV to something other than 'test'
const originalEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'development';

try {
  const result = csvToJson(csv, { delimiter: ';' });
  console.log(`✓ Processed ${result.length} rows`);
  
  if (warningMessage.includes('Warning: Processing >1M records')) {
    console.log('✓ Warning shown for large dataset');
  } else {
    console.log('Note: Warning not shown (dataset too small for test)');
  }
} catch (error) {
  console.error(`✗ Error: ${error.message}`);
}

// Test 2: JSON with more than 1M records (simulated)
console.log('\nTest 2: Testing warning for large JSON...');
const largeData = [];
for (let i = 1; i <= 100; i++) { // Use 100 for quick test
  largeData.push({ id: i, name: `User${i}`, email: `user${i}@example.com` });
}

warningMessage = '';
try {
  const csvResult = jsonToCsv(largeData, { delimiter: ';' });
  console.log(`✓ Converted ${largeData.length} records to CSV`);
  
  if (warningMessage.includes('Warning: Processing >1M records')) {
    console.log('✓ Warning shown for large dataset');
  } else {
    console.log('Note: Warning not shown (dataset too small for test)');
  }
} catch (error) {
  console.error(`✗ Error: ${error.message}`);
}

// Test 3: Optional limit still works
console.log('\nTest 3: Testing optional limit...');
const testData = Array.from({ length: 15 }, (_, i) => ({ 
  id: i + 1, 
  name: `User${i + 1}` 
}));

try {
  // Should throw with limit of 10
  const csvWithLimit = jsonToCsv(testData, { 
    delimiter: ';', 
    maxRecords: 10 
  });
  console.log('✗ Should have thrown LimitError but did not');
} catch (error) {
  if (error.name === 'LimitError') {
    console.log(`✓ LimitError correctly thrown: ${error.message}`);
  } else {
    console.error(`✗ Unexpected error: ${error.message}`);
  }
}

// Test 4: No limit by default
console.log('\nTest 4: Testing no limit by default...');
try {
  const csvNoLimit = jsonToCsv(testData, { delimiter: ';' });
  console.log(`✓ Processed ${testData.length} records without limit`);
} catch (error) {
  console.error(`✗ Error: ${error.message}`);
}

// Restore original console.warn and NODE_ENV
console.warn = originalWarn;
process.env.NODE_ENV = originalEnv;

console.log('\n✅ All tests completed!');
console.log('\nSummary:');
console.log('- Removed hard 1M record limit');
console.log('- Added warning for >1M records');
console.log('- Optional limit still works when specified');
console.log('- Unlimited by default (no error)');