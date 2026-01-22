const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📊 Comprehensive JTCSV CLI Test\n');

// Helper function to run command and capture output
function runCommand(cmd, description) {
  console.log(`\n${description}`);
  console.log(`Command: ${cmd}`);
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(output.trim());
    return { success: true, output };
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    if (error.stdout) {
      console.log('stdout:', error.stdout.toString());
    }
    if (error.stderr) {
      console.log('stderr:', error.stderr.toString());
    }
    return { success: false, error };
  }
}

// Clean up previous test files
const testFiles = [
  'test-basic.json', 'test-basic-back.csv', 'test-auto.json',
  'test-comma.csv', 'test-comma.json', 'test-renamed.json',
  'test-templated.csv', 'test-output.json', 'test-output2.json',
  'test-output-back.csv'
];

testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
});

// Create test data
const testCsv = `id;name;age;salary;active;department
1;John Doe;30;50000.50;true;Engineering
2;Jane Smith;25;45000.75;false;Marketing
3;Bob Johnson;35;55000.25;true;Sales
4;Alice Brown;28;48000.00;true;HR
5;Charlie Wilson;42;60000.50;false;Engineering`;

const testJson = [
  { id: 1, name: 'John Doe', age: 30, salary: 50000.50, active: true, department: 'Engineering' },
  { id: 2, name: 'Jane Smith', age: 25, salary: 45000.75, active: false, department: 'Marketing' },
  { id: 3, name: 'Bob Johnson', age: 35, salary: 55000.25, active: true, department: 'Sales' },
  { id: 4, name: 'Alice Brown', age: 28, salary: 48000.00, active: true, department: 'HR' },
  { id: 5, name: 'Charlie Wilson', age: 42, salary: 60000.50, active: false, department: 'Engineering' }
];

fs.writeFileSync('test-data.csv', testCsv);
fs.writeFileSync('test-data.json', JSON.stringify(testJson));

console.log('✅ Created test files: test-data.csv, test-data.json');

// Run comprehensive tests
const tests = [
  {
    cmd: 'node bin/jtcsv.js --version',
    desc: 'Test 1: Version check'
  },
  {
    cmd: 'node bin/jtcsv.js help',
    desc: 'Test 2: Help command'
  },
  {
    cmd: 'node bin/jtcsv.js csv-to-json test-data.csv test-result1.json --parse-numbers --parse-booleans',
    desc: 'Test 3: CSV to JSON with parsing'
  },
  {
    cmd: 'node bin/jtcsv.js json-to-csv test-result1.json test-result2.csv',
    desc: 'Test 4: JSON to CSV (round trip)'
  },
  {
    cmd: 'node bin/jtcsv.js csv-to-json test-data.csv test-result3.json --auto-detect=false --delimiter=;',
    desc: 'Test 5: CSV to JSON with explicit delimiter'
  },
  {
    cmd: 'node bin/jtcsv.js csv-to-json test-data.csv test-result4.json --no-trim',
    desc: 'Test 6: CSV to JSON without trimming'
  },
  {
    cmd: 'node bin/jtcsv.js json-to-csv test-data.json test-result5.csv --no-headers',
    desc: 'Test 7: JSON to CSV without headers'
  },
  {
    cmd: 'node bin/jtcsv.js json-to-csv test-data.json test-result6.csv --pretty',
    desc: 'Test 8: JSON to CSV with pretty JSON input'
  }
];

let passed = 0;
let failed = 0;

console.log('\n' + '='.repeat(80));
console.log('RUNNING COMPREHENSIVE CLI TESTS');
console.log('='.repeat(80));

tests.forEach((test, index) => {
  const result = runCommand(test.cmd, `\n${test.desc}`);
  if (result.success) {
    passed++;
    console.log(`✅ Test ${index + 1} passed`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1} failed`);
  }
});

// Test with comma-delimited file
console.log('\n' + '='.repeat(80));
console.log('TESTING WITH COMMA-DELIMITED CSV');
console.log('='.repeat(80));

const commaCsv = 'id,name,age,salary,active,department\n1,John Doe,30,50000.50,true,Engineering\n2,Jane Smith,25,45000.75,false,Marketing';
fs.writeFileSync('test-comma2.csv', commaCsv);

const commaTest = runCommand(
  'node bin/jtcsv.js csv-to-json test-comma2.csv test-comma-result.json --delimiter=,',
  'Test with comma delimiter'
);

if (commaTest.success) {
  passed++;
  console.log('✅ Comma delimiter test passed');
} else {
  failed++;
  console.log('❌ Comma delimiter test failed');
}

// Test backward compatibility
console.log('\n' + '='.repeat(80));
console.log('TESTING BACKWARD COMPATIBILITY');
console.log('='.repeat(80));

const backwardTests = [
  {
    cmd: 'node bin/jtcsv.js csv2json test-data.csv test-backward1.json',
    desc: 'Backward compatibility: csv2json'
  },
  {
    cmd: 'node bin/jtcsv.js json2csv test-data.json test-backward2.csv',
    desc: 'Backward compatibility: json2csv'
  }
];

backwardTests.forEach((test, index) => {
  const result = runCommand(test.cmd, test.desc);
  if (result.success) {
    passed++;
    console.log(`✅ Backward test ${index + 1} passed`);
  } else {
    failed++;
    console.log(`❌ Backward test ${index + 1} failed`);
  }
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total tests: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

// Cleanup
const cleanupFiles = [
  'test-data.csv', 'test-data.json', 'test-comma2.csv',
  'test-result1.json', 'test-result2.csv', 'test-result3.json',
  'test-result4.json', 'test-result5.csv', 'test-result6.csv',
  'test-comma-result.json', 'test-backward1.json', 'test-backward2.csv'
];

cleanupFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
});

console.log('\n🧹 Cleaned up test files');

if (failed > 0) {
  console.log('\n❌ Some tests failed. CLI needs improvement.');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed! CLI is ready for production.');
}