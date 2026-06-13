// 02-serialize-json.ts — jtcsv/json: jsonToCsv with default + custom delimiter + rename map
import { strict as assert } from 'node:assert';
import { jsonToCsv } from 'jtcsv/json';

const data = [
  { firstName: 'Ada', lvl: 1 },
  { firstName: 'Grace', lvl: 2 },
];

// Default delimiter for jtcsv is ';'
const def = jsonToCsv(data);
assert.equal(def.split(/\r?\n/)[0], 'firstName;lvl');

// Custom delimiter
const comma = jsonToCsv(data, { delimiter: ',' });
assert.equal(comma.split(/\r?\n/)[0], 'firstName,lvl');

// renameMap rewrites the header row
const renamed = jsonToCsv(data, {
  delimiter: ',',
  renameMap: { firstName: 'Name', lvl: 'Level' },
});
const lines = renamed.split(/\r?\n/);
assert.equal(lines[0], 'Name,Level');
assert.equal(lines[1], 'Ada,1');

console.log('ok');
