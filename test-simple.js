const { execSync } = require('child_process');
const fs = require('fs');

console.log('Testing JTCSV CLI...\n');

try {
  // Test 1: Basic CSV to JSON
  console.log('Test 1: Basic CSV to JSON');
  execSync('node bin/jtcsv.js csv-to-json test-input.csv test-basic.json --parse-numbers --parse-booleans', 
    { stdio: 'inherit' });
  
  // Test 2: Basic JSON to CSV  
  console.log('\nTest 2: Basic JSON to CSV');
  execSync('node bin/jtcsv.js json-to-csv test-basic.json test-basic-back.csv', 
    { stdio: 'inherit' });
  
  // Test 3: With auto-detect
  console.log('\nTest 3: CSV to JSON with auto-detect');
  execSync('node bin/jtcsv.js csv-to-json test-input.csv test-auto.json --auto-detect', 
    { stdio: 'inherit' });
  
  // Test 4: With custom delimiter
  console.log('\nTest 4: CSV to JSON with custom delimiter');
  // Create comma-delimited CSV
  const commaCsv = 'id,name,age,active\n1,John Doe,30,true\n2,Jane Smith,25,false';
  fs.writeFileSync('test-comma.csv', commaCsv);
  execSync('node bin/jtcsv.js csv-to-json test-comma.csv test-comma.json --delimiter=,', 
    { stdio: 'inherit' });
  
  console.log('\n✅ All basic tests passed!');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
}


