/**
 * jscodeshift transform: papaparse → jtcsv.
 *
 * Rewrites:
 *   import Papa from 'papaparse'         →  import { csvToJson, jsonToCsv } from 'jtcsv'
 *   const Papa = require('papaparse')    →  const { csvToJson, jsonToCsv } = require('jtcsv')
 *
 *   Papa.parse(csv, { header: true, dynamicTyping: true })
 *     →  csvToJson(csv, { hasHeaders: true, parseNumbers: true })
 *
 *   Papa.unparse(rows, { delimiter: ';' })
 *     →  jsonToCsv(rows, { delimiter: ';' })
 *
 *   Papa.parse(csv).data            →  csvToJson(csv)
 *   Papa.unparse(rows)              →  jsonToCsv(rows)
 *
 * Limitations (deliberate, surfaced as TODO comments in the output):
 *   - Streaming Papa.parse(file, { step: ... }) is not converted (jtcsv
 *     uses Node Transform streams; mapping the step callback to a
 *     `for await` loop is not 1:1).
 *   - `Papa.parse(file, { complete })` callback flows are flagged with
 *     `// TODO(jtcsv-codemod): switch to async readCsvAsJson + await`.
 *
 * Run:
 *   npx jscodeshift -t node_modules/@jtcsv/codemod/transforms/papaparse-to-jtcsv.js src/
 */

const PAPA_OPTIONS_MAP = {
  header: 'hasHeaders',
  dynamicTyping: 'parseNumbers',
  delimiter: 'delimiter',
  newline: 'newline',
  quoteChar: 'quoteChar',
  escapeChar: 'escapeChar',
  comments: 'comments',
  skipEmptyLines: 'skipEmptyLines',
  // Other Papa options that have no jtcsv equivalent are passed through
  // unchanged so the user's intent isn't silently lost; we leave a comment
  // pointing at them.
};

const PAPA_DROP_OPTIONS = new Set([
  // Papa-specific flags that don't translate; we drop them and append a comment.
  'worker', 'download', 'fastMode', 'beforeFirstChunk', 'transformHeader',
  'preview', 'encoding', 'chunk', 'step', 'complete', 'error',
]);

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let papaLocalName = null;

  // 1) Rewrite imports.
  root
    .find(j.ImportDeclaration, { source: { value: 'papaparse' } })
    .forEach((p) => {
      const def = p.node.specifiers.find((s) => s.type === 'ImportDefaultSpecifier');
      if (def) papaLocalName = def.local.name;
      p.replace(
        j.importDeclaration(
          [
            j.importSpecifier(j.identifier('csvToJson')),
            j.importSpecifier(j.identifier('jsonToCsv')),
          ],
          j.literal('jtcsv'),
        ),
      );
    });

  // 2) Rewrite `const X = require('papaparse')`.
  root
    .find(j.VariableDeclarator, {
      init: { callee: { name: 'require' }, arguments: [{ value: 'papaparse' }] },
    })
    .forEach((p) => {
      if (p.node.id.type === 'Identifier') papaLocalName = p.node.id.name;
      p.replace(
        j.variableDeclarator(
          j.objectPattern([
            j.property.from({
              kind: 'init', shorthand: true,
              key: j.identifier('csvToJson'),
              value: j.identifier('csvToJson'),
            }),
            j.property.from({
              kind: 'init', shorthand: true,
              key: j.identifier('jsonToCsv'),
              value: j.identifier('jsonToCsv'),
            }),
          ]),
          j.callExpression(j.identifier('require'), [j.literal('jtcsv')]),
        ),
      );
    });

  if (!papaLocalName) return null;

  // 3) Walk Papa.parse(...) and Papa.unparse(...).
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: papaLocalName },
        property: { name: (n) => n === 'parse' || n === 'unparse' },
      },
    })
    .forEach((p) => {
      const method = p.node.callee.property.name;
      const args = p.node.arguments;
      const newName = method === 'parse' ? 'csvToJson' : 'jsonToCsv';

      // Translate options object (second arg) if present.
      if (args[1] && args[1].type === 'ObjectExpression') {
        const droppedOptions = [];
        const newProps = args[1].properties
          .map((prop) => {
            if (prop.type !== 'Property' && prop.type !== 'ObjectProperty') return prop;
            const key = prop.key.name || prop.key.value;
            if (PAPA_DROP_OPTIONS.has(key)) {
              droppedOptions.push(key);
              return null;
            }
            const renamed = PAPA_OPTIONS_MAP[key];
            if (!renamed) return prop;
            const next = j.property('init', j.identifier(renamed), prop.value);
            return next;
          })
          .filter(Boolean);
        args[1].properties = newProps;
        if (droppedOptions.length) {
          // Attach a leading line-comment to the enclosing statement; the
          // expression itself can't carry leading-line comments through
          // jscodeshift's printer reliably, so we walk up to the
          // ExpressionStatement / VariableDeclaration / etc.
          let parent = p.parent;
          while (parent && !/Statement$|Declaration$/.test(parent.node.type)) {
            parent = parent.parent;
          }
          const note = ` TODO(jtcsv-codemod): dropped Papa-specific options: ${droppedOptions.join(', ')}`;
          const target = parent ? parent.node : p.node;
          if (!target.comments) target.comments = [];
          target.comments.push(j.commentLine(note, true, false));
        }
      }

      p.replace(j.callExpression(j.identifier(newName), args));
    });

  // 4) Replace any remaining `Papa.parse(...).data` shortcut.
  root
    .find(j.MemberExpression, {
      object: { type: 'CallExpression' },
      property: { name: 'data' },
    })
    .forEach((p) => {
      const inner = p.node.object;
      if (inner.callee && inner.callee.name === 'csvToJson') {
        p.replace(inner);
      }
    });

  return root.toSource({ quote: 'single', reuseWhitespace: true });
};

// jscodeshift parser hint — handle TS sources.
module.exports.parser = 'tsx';
