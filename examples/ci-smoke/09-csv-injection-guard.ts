// 09-csv-injection-guard.ts — verify CSV-injection guard is ON by default
import { strict as assert } from 'node:assert';
import { jsonToCsv } from 'jtcsv/json';

const out = jsonToCsv([{ a: '=cmd|"/c calc"!A1' }]);
const lines = out.split(/\r?\n/);

// Header line first
assert.equal(lines[0], 'a');

// The dangerous value must be prefixed with a single-quote sentinel to neutralize
// spreadsheet-formula injection. The cell ends up quoted because it contains a comma/quotes.
const cell = lines[1];
assert.ok(cell.startsWith("\"'="), `expected sanitized cell to start with "'=, got: ${cell}`);
assert.ok(!cell.startsWith('"='), 'guard did not neutralize leading =');

console.log('ok');
