const FastPathEngine = require('./src/engines/fast-path-engine');

const engine = new FastPathEngine();

// Тестируем разные CSV
const testCases = [
  {
    name: 'Simple CSV',
    csv: 'id,name,description\n1,John,Software engineer\n2,Jane,Data analyst',
    expected: ','
  },
  {
    name: 'CSV with quotes',
    csv: 'id,name,description\n1,John,"Software engineer"\n2,Jane,"Data analyst"',
    expected: ','
  },
  {
    name: 'CSV with semicolon',
    csv: 'id;name;description\n1;John;Software engineer\n2;Jane;Data analyst',
    expected: ';'
  },
  {
    name: 'CSV with tab',
    csv: 'id\tname\tdescription\n1\tJohn\tSoftware engineer\n2\tJane\tData analyst',
    expected: '\t'
  }
];

console.log('Testing delimiter detection:');
for (const testCase of testCases) {
  const delimiter = engine._detectDelimiter(testCase.csv);
  const passed = delimiter === testCase.expected;
  console.log(`\n${testCase.name}:`);
  console.log(`  Expected: ${JSON.stringify(testCase.expected)}`);
  console.log(`  Got: ${JSON.stringify(delimiter)}`);
  console.log(`  Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
}


