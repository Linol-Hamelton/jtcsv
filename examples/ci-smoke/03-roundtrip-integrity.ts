// 03-roundtrip-integrity.ts — jsonToCsv -> csvToJson, asserts deepStrictEqual
import { strict as assert } from 'node:assert';
import { jsonToCsv } from 'jtcsv/json';
import { csvToJson } from 'jtcsv/csv';

const original = [
  { id: 1, name: 'Ada', active: true },
  { id: 2, name: 'Grace', active: false },
  { id: 3, name: 'Linus', active: true },
];

const csv = jsonToCsv(original);
const restored = csvToJson(csv, { parseNumbers: true, parseBooleans: true });

assert.deepStrictEqual(restored, original);

console.log('ok');
