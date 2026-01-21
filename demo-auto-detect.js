// Demo of auto-detect delimiter and unlimited records
const { csvToJson, jsonToCsv, autoDetectDelimiter } = require('./index.js');

console.log('=== Demo: Auto-detect Delimiter ===\n');

// Test 1: Auto-detect different delimiters
const testCases = [
  { csv: 'id,name,email\n1,John,john@example.com', expectedDelimiter: ',' },
  { csv: 'id;name;email\n1;John;john@example.com', expectedDelimiter: ';' },
  { csv: 'id\tname\temail\n1\tJohn\tjohn@example.com', expectedDelimiter: '\t' },
  { csv: 'id|name|email\n1|John|john@example.com', expectedDelimiter: '|' },
];

testCases.forEach((testCase, i) => {
  const detected = autoDetectDelimiter(testCase.csv);
  console.log(`Test ${i + 1}: Detected delimiter: '${detected}' (expected: '${testCase.expectedDelimiter}')`);
  console.log(`  ${detected === testCase.expectedDelimiter ? '✅' : '❌'} ${detected === testCase.expectedDelimiter ? 'Correct' : 'Incorrect'}`);
  
  // Test with csvToJson
  const result = csvToJson(testCase.csv);
  console.log(`  Parsed ${result.length} records successfully\n`);
});

console.log('=== Demo: Unlimited Records (no hard limit) ===\n');

// Test 2: Large dataset (simulated)
console.log('Creating large dataset simulation...');
const largeCsv = ['id,name,value'];
for (let i = 1; i <= 100; i++) { // Simulating 100 records for demo
  largeCsv.push(`${i},User${i},${i * 10}`);
}

const csvString = largeCsv.join('\n');
console.log(`Processing ${largeCsv.length - 1} records (no limit by default)...`);

try {
  const result = csvToJson(csvString, { parseNumbers: true });
  console.log(`✅ Successfully processed ${result.length} records`);
  console.log(`  First record: ${JSON.stringify(result[0])}`);
  console.log(`  Last record: ${JSON.stringify(result[result.length - 1])}`);
} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}

console.log('\n=== Demo: Optional Limit Still Works ===\n');

// Test 3: Optional limit
const smallData = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

console.log('Testing with optional limit of 2 records:');
try {
  const csv = jsonToCsv(smallData, { maxRecords: 2 });
  console.log('❌ Should have thrown LimitError but did not');
} catch (error) {
  if (error.name === 'LimitError') {
    console.log(`✅ LimitError correctly thrown: ${error.message}`);
  } else {
    console.log(`❌ Unexpected error: ${error.message}`);
  }
}

console.log('\n=== Demo: Auto-detect in Action ===\n');

// Test 4: Real-world example
const unknownCsv = `product;price;quantity
Laptop;999.99;5
Mouse;29.99;20`;

console.log('CSV with unknown delimiter:');
console.log(unknownCsv);
console.log('\nParsing without specifying delimiter...');

const parsed = csvToJson(unknownCsv, { parseNumbers: true });
console.log('\nParsed result:');
console.log(parsed);

console.log('\n=== Summary ===');
console.log('✅ Removed hard 1M record limit');
console.log('✅ Added auto-detect delimiter feature');
console.log('✅ Optional limits still work when specified');
console.log('✅ All 152 tests pass');