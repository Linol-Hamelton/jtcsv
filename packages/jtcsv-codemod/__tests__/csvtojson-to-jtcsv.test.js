/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Tests for transforms/csvtojson-to-jtcsv.js. We use jscodeshift's
 * applyTransform helper, normalize whitespace, and assert on substrings —
 * jscodeshift formats object literals and chained CallExpressions on
 * multiple lines once they cross a width threshold.
 */
const { applyTransform } = require('jscodeshift/dist/testUtils');
const transform = require('../transforms/csvtojson-to-jtcsv');
const papaparseTransform = require('../transforms/papaparse-to-jtcsv');

function run(src) {
  return applyTransform(transform, {}, { source: src, path: 'input.ts' }) || '';
}

function runPapa(src) {
  return applyTransform(papaparseTransform, {}, { source: src, path: 'input.ts' }) || '';
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();

describe('csvtojson → jtcsv', () => {
  test('a) ESM import + fromString', () => {
    const out = run(`import csv from 'csvtojson';\nconst x = csv().fromString(s);`);
    expect(norm(out)).toContain("from 'jtcsv'");
    expect(norm(out)).toContain('csvToJson');
    expect(norm(out)).toContain('csvToJson(s)');
    expect(out).not.toMatch(/'csvtojson'/);
  });

  test('b) CJS require + fromString', () => {
    const out = run(`const csv = require('csvtojson');\nconst x = csv().fromString(s);`);
    expect(norm(out)).toContain("require('jtcsv')");
    expect(norm(out)).toContain('csvToJson');
    expect(norm(out)).toContain('csvToJson(s)');
  });

  test('c) local binding name independence', () => {
    const out = run(`const csvtojson = require('csvtojson');\nconst x = csvtojson().fromString(s);`);
    expect(norm(out)).toContain("require('jtcsv')");
    expect(norm(out)).toContain('csvToJson(s)');
  });

  test('d) fromFile → readCsvAsJson (named import added)', () => {
    const out = run(`import csv from 'csvtojson';\nconst x = await csv().fromFile('a.csv');`);
    expect(norm(out)).toContain("from 'jtcsv'");
    expect(norm(out)).toContain('readCsvAsJson');
    expect(norm(out)).toMatch(/readCsvAsJson\(\s*'a\.csv'\s*\)/);
  });

  test('e) noheader: true → hasHeaders: false', () => {
    const out = run(`import csv from 'csvtojson';\ncsv({ noheader: true }).fromString(s);`);
    expect(out).toMatch(/hasHeaders:\s*false/);
    expect(out).not.toMatch(/noheader/);
  });

  test('f) checkType: true → parseNumbers + parseBooleans', () => {
    const out = run(`import csv from 'csvtojson';\ncsv({ checkType: true }).fromString(s);`);
    expect(out).toMatch(/parseNumbers:\s*true/);
    expect(out).toMatch(/parseBooleans:\s*true/);
    expect(out).not.toMatch(/checkType/);
  });

  test('g) trim: true passes through', () => {
    const out = run(`import csv from 'csvtojson';\ncsv({ trim: true }).fromString(s);`);
    expect(out).toMatch(/trim:\s*true/);
  });

  test('h) unmappable options dropped with TODO comment', () => {
    const out = run(
      `import csv from 'csvtojson';\ncsv({ includeColumns: /x/, output: 'json', colParser: {} }).fromString(s);`,
    );
    // Strip the comment block first; the option names should appear ONLY in the comment.
    const withoutComments = out.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(withoutComments).not.toMatch(/includeColumns/);
    expect(withoutComments).not.toMatch(/colParser/);
    expect(withoutComments).not.toMatch(/output:/);
    expect(out).toMatch(/TODO\(jtcsv-codemod\): dropped csvtojson options:.*includeColumns.*output.*colParser/s);
  });

  test('i) fromStream(...).subscribe(rowCb,errCb,endCb) → pipe + on chain', () => {
    const out = run(
      `import csv from 'csvtojson';\ncsv().fromStream(readable).subscribe(rowCb, errCb, endCb);`,
    );
    expect(norm(out)).toContain('createCsvToJsonStream');
    expect(norm(out)).toContain('readable.pipe(createCsvToJsonStream())');
    expect(out).toMatch(/\.on\(\s*'data'\s*,\s*rowCb\s*\)/);
    expect(out).toMatch(/\.on\(\s*'error'\s*,\s*errCb\s*\)/);
    expect(out).toMatch(/\.on\(\s*'end'\s*,\s*endCb\s*\)/);
    expect(out).not.toMatch(/subscribe/);
  });

  test('j) preFileLine — left intact, TODO comment prepended', () => {
    const out = run(
      `import csv from 'csvtojson';\ncsv().preFileLine(fn).fromFile('a.csv');`,
    );
    expect(out).toMatch(/preFileLine/);
    expect(out).toMatch(/TODO\(jtcsv-codemod\): preFileLine has no jtcsv equivalent/);
  });

  test('k) no csvtojson usage → no changes (no-op)', () => {
    const out = run(`import { something } from 'lodash';\nconst x = 1;`);
    expect(out === undefined || out === '' || out === null).toBe(true);
  });

  test('l) file with only papaparse imports is untouched by csvtojson transform', () => {
    const src = `import Papa from 'papaparse';\nconst x = Papa.parse(s, { header: true });`;
    const out = run(src);
    // Transform should be a no-op for a file with no csvtojson reference.
    expect(out === undefined || out === '' || out === null).toBe(true);
    // Sanity: the papaparse transform still works on the same source.
    const outPapa = runPapa(src);
    expect(norm(outPapa)).toContain("from 'jtcsv'");
    expect(norm(outPapa)).toContain('csvToJson');
  });

  test('m) fromString(...).then(cb) — leaves .then intact', () => {
    const out = run(`import csv from 'csvtojson';\ncsv().fromString(s).then(cb);`);
    expect(norm(out)).toContain('csvToJson(s).then(cb)');
  });

  test('n) on(data).fromFile(p) → createCsvFileToJsonStream(p).on("data", cb) + TODO', () => {
    const out = run(
      `import csv from 'csvtojson';\ncsv().on('data', cb).fromFile('a.csv');`,
    );
    expect(norm(out)).toContain('createCsvFileToJsonStream');
    expect(out).toMatch(/TODO\(jtcsv-codemod\): createCsvFileToJsonStream returns Promise<Readable>/);
  });
});
