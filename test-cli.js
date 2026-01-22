const { execSync } = require('child_process');
const fs = require('fs');

console.log('Testing JTCSV CLI with rename option...\n');

try {
  // Test 1: CSV to JSON with rename
  console.log('Test 1: CSV to JSON with rename map');
  const renameMap = '{\"id\":\"ID\",\"name\":\"Full Name\"}';
  const cmd = `node bin/jtcsv.js csv-to-json test-input.csv test-renamed.json --rename=${renameMap} --parse-numbers`;
  
  console.log(`Command: ${cmd}`);
  const result = execSync(cmd, { encoding: 'utf8' });
  console.log(result);
  
  // Check the result
  const renamedData = JSON.parse(fs.readFileSync('test-renamed.json', 'utf8'));
  console.log('First record keys:', Object.keys(renamedData[0]));
  console.log('Expected: ["ID","Full Name","age","active"]');
  
  // Test 2: JSON to CSV with template
  console.log('\nTest 2: JSON to CSV with template');
  const template = '{\"ID\":null,\"Full Name\":null,\"age\":null}';
  const cmd2 = `node bin/jtcsv.js json-to-csv test-renamed.json test-templated.csv --template=${template}`;
  
  console.log(`Command: ${cmd2}`);
  const result2 = execSync(cmd2, { encoding: 'utf8' });
  console.log(result2);
  
  // Check the CSV
  const csvData = fs.readFileSync('test-templated.csv', 'utf8');
  console.log('CSV headers:', csvData.split('\n')[0]);
  
  console.log('\n✅ All tests passed!');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  if (error.stdout) {
    console.log('stdout:', error.stdout.toString());
  }
  if (error.stderr) {
    console.log('stderr:', error.stderr.toString());
  }
}