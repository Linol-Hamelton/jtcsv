/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Tests for transforms/papaparse-to-jtcsv.js. Each test runs the
 * transform via jscodeshift's applyTransform helper and asserts on
 * substrings — jscodeshift formats object literals across multiple
 * lines once they reach a width threshold, so we don't pin to exact
 * single-line output.
 */
const { applyTransform } = require('jscodeshift/dist/testUtils');
const transform = require('../transforms/papaparse-to-jtcsv');

function run(src) {
  return applyTransform(transform, {}, { source: src, path: 'input.ts' }) || '';
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();

describe('papaparse → jtcsv', () => {
  test('rewrites default ESM import', () => {
    const out = run(`import Papa from 'papaparse';\nconst x = Papa.parse('a,b\\n1,2', { header: true });`);
    expect(norm(out)).toContain("import { csvToJson, jsonToCsv } from 'jtcsv'");
    expect(norm(out)).toContain('csvToJson(\'a,b\\n1,2\', { hasHeaders: true })');
    expect(out).not.toMatch(/Papa\b/);
  });

  test('rewrites CommonJS require', () => {
    const out = run(`const Papa = require('papaparse');\nconst x = Papa.unparse([{a:1}], { delimiter: ';' });`);
    expect(norm(out)).toContain("const { csvToJson, jsonToCsv } = require('jtcsv')");
    // jscodeshift preserves the original AST formatting; we just check
    // the call site was renamed and the delimiter survived.
    expect(norm(out)).toContain("jsonToCsv([{a:1}],");
    expect(norm(out)).toContain("delimiter: ';'");
  });

  test('renames dynamicTyping → parseNumbers', () => {
    const out = run(`import Papa from 'papaparse';\nPapa.parse(csv, { dynamicTyping: true });`);
    expect(out).toMatch(/parseNumbers:\s*true/);
    expect(out).not.toMatch(/dynamicTyping/);
  });

  test('drops Papa-specific options with a TODO comment', () => {
    const out = run(`import Papa from 'papaparse';\nPapa.parse(csv, { header: true, worker: true, complete: cb });`);
    expect(out).toMatch(/hasHeaders:\s*true/);
    expect(out).not.toMatch(/worker:/);
    expect(out).not.toMatch(/complete:/);
    expect(out).toMatch(/TODO\(jtcsv-codemod\): dropped Papa-specific options:.*worker.*complete/s);
  });

  test('Papa.parse(...).data unwraps to csvToJson(...)', () => {
    const out = run(`import Papa from 'papaparse';\nconst rows = Papa.parse(csv).data;`);
    expect(norm(out)).toContain('const rows = csvToJson(csv);');
    expect(out).not.toMatch(/\.data/);
  });

  test('preserves source when no papaparse usage', () => {
    const out = run(`import { something } from 'lodash';\nconst x = 1;`);
    expect(out === undefined || out === '' || out === null).toBe(true);
  });

  test('handles aliased import name', () => {
    const out = run(`import PP from 'papaparse';\nPP.parse(csv, { header: true });`);
    expect(norm(out)).toContain('csvToJson(csv, { hasHeaders: true })');
  });
});
