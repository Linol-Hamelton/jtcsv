// 01-parse-csv.ts — jtcsv/csv: csvToJson with parseNumbers, parseBooleans, autoDetect
import { strict as assert } from 'node:assert';
import { csvToJson, autoDetectDelimiter } from 'jtcsv/csv';

const csv = 'name;age;active\nAda;36;true\nGrace;85;false';

const detected = autoDetectDelimiter(csv);
assert.equal(detected, ';');

const rows = csvToJson(csv, {
  autoDetect: true,
  parseNumbers: true,
  parseBooleans: true,
});

assert.equal(rows.length, 2);
assert.deepStrictEqual(rows[0], { name: 'Ada', age: 36, active: true });
assert.deepStrictEqual(rows[1], { name: 'Grace', age: 85, active: false });

console.log('ok');
