// 06-ndjson-roundtrip.ts — jsonToNdjson -> ndjsonToJson, deepStrictEqual
import { strict as assert } from 'node:assert';
import { jsonToNdjson, ndjsonToJson } from 'jtcsv/ndjson';

const data = [
  { id: 1, label: 'alpha' },
  { id: 2, label: 'beta' },
  { id: 3, label: 'gamma' },
];

const nd = jsonToNdjson(data);
assert.equal(typeof nd, 'string');
assert.equal(nd.split('\n').length, 3);

const restored = ndjsonToJson(nd);
assert.deepStrictEqual(restored, data);

console.log('ok');
