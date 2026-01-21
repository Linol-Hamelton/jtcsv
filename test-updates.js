const { jsonToCsv } = require('./json-to-csv');

// Test 1: Проверка preventCsvInjection
console.log('Test 1: preventCsvInjection');
const data1 = [
  { id: 1, formula: '=1+1', text: 'normal' },
  { id: 2, formula: '@mention', text: 'another' }
];

const csv1 = jsonToCsv(data1, { preventCsvInjection: true });
console.log('With prevention:', csv1);

const csv2 = jsonToCsv(data1, { preventCsvInjection: false });
console.log('Without prevention:', csv2);

// Test 2: Проверка RFC 4180 compliance
console.log('\nTest 2: RFC 4180 compliance');
const data2 = [
  { id: 1, name: 'John\nDoe', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' }
];

const csv3 = jsonToCsv(data2, { rfc4180Compliant: true });
console.log('RFC 4180 compliant (CRLF):', JSON.stringify(csv3));

const csv4 = jsonToCsv(data2, { rfc4180Compliant: false });
console.log('Not RFC 4180 compliant (LF):', JSON.stringify(csv4));

// Test 3: Проверка CSV to JSON (если доступно)
try {
  const { csvToJson } = require('./csv-to-json');
  console.log('\nTest 3: CSV to JSON');
  const csvData = 'id;name;email\n1;John;john@example.com\n2;Jane;jane@example.com';
  const json = csvToJson(csvData, { delimiter: ';' });
  console.log('CSV to JSON result:', JSON.stringify(json, null, 2));
} catch (error) {
  console.log('CSV to JSON not available:', error.message);
}

// Test 4: Проверка streaming (если доступно)
try {
  const { createJsonToCsvStream } = require('./stream-json-to-csv');
  console.log('\nTest 4: Streaming API available');
  console.log('Streaming API is implemented');
} catch (error) {
  console.log('Streaming API not available:', error.message);
}