// 07-tsv-roundtrip.ts — jtcsv/tsv: jsonToTsv -> tsvToJson roundtrip
import { strict as assert } from 'node:assert';
import { jsonToTsv, tsvToJson } from 'jtcsv/tsv';

const data = [
  { id: '1', name: 'Ada' },
  { id: '2', name: 'Grace' },
];

const tsv = jsonToTsv(data);
assert.equal(typeof tsv, 'string');
assert.ok(tsv.includes('\t'), 'expected tab delimiter in TSV');

const restored = tsvToJson(tsv);
assert.deepStrictEqual(restored, data);

console.log('ok');
