// 11-fast-path-engine.ts — fast-path vs slow-path parity smoke test
import { strict as assert } from 'node:assert';
import { csvToJson } from 'jtcsv/csv';

const csv = [
  'id,name,score',
  '1,Ada,42',
  '2,Grace,99',
  '3,Linus,17',
].join('\n');

const fast = csvToJson(csv, { useFastPath: true, parseNumbers: true });
const slow = csvToJson(csv, { useFastPath: false, parseNumbers: true });

assert.deepStrictEqual(fast, slow);
assert.equal(fast.length, 3);
assert.deepStrictEqual(fast[0], { id: 1, name: 'Ada', score: 42 });

console.log('ok');
