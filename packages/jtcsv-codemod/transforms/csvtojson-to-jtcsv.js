/**
 * jscodeshift transform: csvtojson → jtcsv.
 *
 * Rewrites:
 *   import csv from 'csvtojson'                  → import { csvToJson, ... } from 'jtcsv'
 *   const csv = require('csvtojson')             → const { csvToJson, ... } = require('jtcsv')
 *
 *   csv().fromString(s)                          → csvToJson(s)
 *   csv().fromString(s).then(cb)                 → csvToJson(s).then(cb)
 *   await csv().fromFile(p)                      → await readCsvAsJson(p)
 *   csv({opts}).fromString(s)                    → csvToJson(s, { ...rewritten })
 *   csv({opts}).fromFile(p)                      → readCsvAsJson(p, { ...rewritten })
 *
 *   csv().fromStream(readable).subscribe(rowCb, errCb, endCb)
 *     → readable.pipe(createCsvToJsonStream()).on('data', rowCb).on('error', errCb).on('end', endCb)
 *
 *   csv().on('data', cb).fromFile(p)             → createCsvFileToJsonStream(p).on('data', cb)  (+ TODO)
 *
 * Surfaced as TODO comments rather than silently rewritten:
 *   - csv().on('json', cb).fromString(s)         — 'json' event maps to 'data' on stream
 *   - csv().preFileLine(fn).fromFile(p)          — no jtcsv equivalent
 *
 * Option renames inside the constructor object:
 *   noheader: true       → hasHeaders: false   (negated)
 *   delimiter            → delimiter           (pass-through)
 *   checkType: true      → parseNumbers: true, parseBooleans: true (fan-out)
 *   trim                 → trim                (pass-through)
 *   output / includeColumns / ignoreColumns / colParser → dropped + TODO comment
 *
 * Run:
 *   npx jscodeshift -t node_modules/jtcsv-codemod/transforms/csvtojson-to-jtcsv.js src/
 */

const PASSTHROUGH_OPTS = new Set(['delimiter', 'trim']);
const DROP_OPTS = new Set(['output', 'includeColumns', 'ignoreColumns', 'colParser']);

function attachTodo(j, p, note) {
  let parent = p.parent;
  while (parent && !/Statement$|Declaration$/.test(parent.node.type)) {
    parent = parent.parent;
  }
  const target = parent ? parent.node : p.node;
  if (!target.comments) target.comments = [];
  target.comments.push(j.commentBlock(` ${note} `, true, false));
}

/**
 * Rewrite an options object literal from csvtojson → jtcsv semantics.
 * Returns the new ObjectExpression and a list of dropped option names.
 */
function rewriteOptions(j, objExpr) {
  const dropped = [];
  const newProps = [];
  for (const prop of objExpr.properties) {
    if (prop.type !== 'Property' && prop.type !== 'ObjectProperty') {
      newProps.push(prop);
      continue;
    }
    const key = prop.key.name || prop.key.value;
    if (key === 'noheader') {
      // noheader: <val>  →  hasHeaders: !<val>
      const val = prop.value;
      let negated;
      if (val.type === 'Literal' || val.type === 'BooleanLiteral') {
        negated = j.literal(!val.value);
      } else {
        negated = j.unaryExpression('!', val, true);
      }
      newProps.push(j.property('init', j.identifier('hasHeaders'), negated));
      continue;
    }
    if (key === 'checkType') {
      // checkType: <val>  →  parseNumbers: <val>, parseBooleans: <val>
      newProps.push(j.property('init', j.identifier('parseNumbers'), prop.value));
      newProps.push(
        j.property('init', j.identifier('parseBooleans'), j.identifier.from
          ? prop.value
          : prop.value),
      );
      continue;
    }
    if (PASSTHROUGH_OPTS.has(key)) {
      newProps.push(prop);
      continue;
    }
    if (DROP_OPTS.has(key)) {
      dropped.push(key);
      continue;
    }
    // Unknown — keep as-is; safer than dropping.
    newProps.push(prop);
  }
  return { object: j.objectExpression(newProps), dropped };
}

/**
 * Walk a call chain like csv(opts).fromX(arg).y(...).z(...)
 * Returns { head, optsArg, chain } where chain is an array of
 * { method, args } in source order (outermost-first).
 */
function flattenChain(node) {
  // Walk from the outermost call inward, collecting (method, args)
  // pairs. The innermost CallExpression should be `csv(...)` (the
  // local binding); we return its first arg as optsArg.
  const chain = [];
  let cur = node;
  while (
    cur &&
    cur.type === 'CallExpression' &&
    cur.callee.type === 'MemberExpression' &&
    cur.callee.property.type === 'Identifier'
  ) {
    chain.unshift({ method: cur.callee.property.name, args: cur.arguments });
    cur = cur.callee.object;
  }
  // cur should now be a CallExpression whose callee is the local binding.
  if (cur && cur.type === 'CallExpression' && cur.callee.type === 'Identifier') {
    const optsArg = cur.arguments && cur.arguments[0];
    return { headCallee: cur.callee.name, optsArg, chain };
  }
  return null;
}

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let localName = null;

  // 1) ESM default import.
  root
    .find(j.ImportDeclaration, { source: { value: 'csvtojson' } })
    .forEach((p) => {
      const def = p.node.specifiers.find((s) => s.type === 'ImportDefaultSpecifier');
      if (def) localName = def.local.name;
    });

  // 2) CommonJS require.
  root
    .find(j.VariableDeclarator, {
      init: { callee: { name: 'require' }, arguments: [{ value: 'csvtojson' }] },
    })
    .forEach((p) => {
      if (p.node.id.type === 'Identifier') localName = p.node.id.name;
    });

  if (!localName) return null;

  // Track which named imports from jtcsv we actually need.
  const needed = new Set();

  // 3) Walk every CallExpression that ends a csvtojson chain
  // (i.e. the outermost call whose innermost callee is `localName`).
  // We process from outermost in.
  root
    .find(j.CallExpression)
    .filter((p) => {
      // Skip if parent is another CallExpression with this node as callee.object —
      // that means there is a larger enclosing chain we should rewrite instead.
      const parent = p.parent.node;
      if (
        parent &&
        parent.type === 'MemberExpression' &&
        parent.object === p.node &&
        p.parent.parent.node &&
        p.parent.parent.node.type === 'CallExpression' &&
        p.parent.parent.node.callee === parent
      ) {
        return false;
      }
      // Must be a chain whose innermost callee is the csv local binding.
      const flat = flattenChain(p.node);
      return !!flat && flat.headCallee === localName;
    })
    .forEach((p) => {
      const flat = flattenChain(p.node);
      if (!flat) return;
      const { optsArg, chain } = flat;

      // Look for a from* call.
      const fromIdx = chain.findIndex(
        (c) => c.method === 'fromString' || c.method === 'fromFile' || c.method === 'fromStream',
      );
      if (fromIdx === -1) return;
      const fromCall = chain[fromIdx];

      // Detect unsupported handler chains.
      const hasOn = chain.some((c) => c.method === 'on');
      const hasPreFileLine = chain.some((c) => c.method === 'preFileLine');
      const hasSubscribe = chain.some((c) => c.method === 'subscribe');

      // ---- preFileLine: leave the source untouched, emit TODO. ----
      if (hasPreFileLine) {
        attachTodo(
          j,
          p,
          "TODO(jtcsv-codemod): preFileLine has no jtcsv equivalent; preprocess the stream manually before piping.",
        );
        return;
      }

      // ---- .on('json', ...): leave, emit TODO. ----
      const onJson = chain.find(
        (c) =>
          c.method === 'on' &&
          c.args[0] &&
          (c.args[0].value === 'json' || c.args[0].value === 'end_parsed'),
      );
      if (onJson) {
        attachTodo(
          j,
          p,
          "TODO(jtcsv-codemod): 'json'/'end_parsed' event maps to 'data' on createCsvToJsonStream; rewrite manually.",
        );
        return;
      }

      // ---- Build rewritten options. ----
      let rewrittenOpts = null;
      let dropped = [];
      if (optsArg && optsArg.type === 'ObjectExpression') {
        const r = rewriteOptions(j, optsArg);
        rewrittenOpts = r.object;
        dropped = r.dropped;
      }

      // ---- fromStream(...).subscribe(rowCb, errCb, endCb) ----
      if (fromCall.method === 'fromStream' && hasSubscribe) {
        const subIdx = chain.findIndex((c) => c.method === 'subscribe');
        const subArgs = chain[subIdx].args;
        const readable = fromCall.args[0];
        needed.add('createCsvToJsonStream');

        // readable.pipe(createCsvToJsonStream())
        let node = j.callExpression(
          j.memberExpression(readable, j.identifier('pipe')),
          [j.callExpression(j.identifier('createCsvToJsonStream'), [])],
        );
        const events = ['data', 'error', 'end'];
        subArgs.forEach((cb, i) => {
          if (!cb || cb.type === 'NullLiteral' || (cb.type === 'Literal' && cb.value === null)) return;
          node = j.callExpression(
            j.memberExpression(node, j.identifier('on')),
            [j.literal(events[i]), cb],
          );
        });
        p.replace(node);
        if (dropped.length) {
          attachTodo(
            j,
            p,
            `TODO(jtcsv-codemod): dropped csvtojson options: ${dropped.join(', ')}`,
          );
        }
        return;
      }

      // ---- .on('data', cb).fromFile(p) ----
      if (hasOn && fromCall.method === 'fromFile') {
        const onCall = chain.find((c) => c.method === 'on');
        needed.add('createCsvFileToJsonStream');
        const filePathArg = fromCall.args[0];
        const streamCall = j.callExpression(
          j.identifier('createCsvFileToJsonStream'),
          rewrittenOpts ? [filePathArg, rewrittenOpts] : [filePathArg],
        );
        const onChain = j.callExpression(
          j.memberExpression(streamCall, j.identifier('on')),
          onCall.args,
        );
        p.replace(onChain);
        attachTodo(
          j,
          p,
          "TODO(jtcsv-codemod): createCsvFileToJsonStream returns Promise<Readable>; you may need to await it before .on().",
        );
        if (dropped.length) {
          attachTodo(
            j,
            p,
            `TODO(jtcsv-codemod): dropped csvtojson options: ${dropped.join(', ')}`,
          );
        }
        return;
      }

      // ---- Simple fromString / fromFile, possibly followed by .then(...) ----
      let newCall;
      if (fromCall.method === 'fromString') {
        needed.add('csvToJson');
        newCall = j.callExpression(
          j.identifier('csvToJson'),
          rewrittenOpts ? [fromCall.args[0], rewrittenOpts] : [fromCall.args[0]],
        );
      } else if (fromCall.method === 'fromFile') {
        needed.add('readCsvAsJson');
        newCall = j.callExpression(
          j.identifier('readCsvAsJson'),
          rewrittenOpts ? [fromCall.args[0], rewrittenOpts] : [fromCall.args[0]],
        );
      } else {
        return;
      }

      // Re-apply any trailing chain calls AFTER the from* (e.g. .then(cb)).
      let result = newCall;
      for (let i = fromIdx + 1; i < chain.length; i++) {
        const seg = chain[i];
        result = j.callExpression(
          j.memberExpression(result, j.identifier(seg.method)),
          seg.args,
        );
      }
      p.replace(result);
      if (dropped.length) {
        attachTodo(
          j,
          p,
          `TODO(jtcsv-codemod): dropped csvtojson options: ${dropped.join(', ')}`,
        );
      }
    });

  // 4) Rewrite the imports / require, using the `needed` set.
  // Ensure we always have at least csvToJson if nothing was tracked.
  if (needed.size === 0) needed.add('csvToJson');
  const namedSpecs = [...needed].sort();

  root
    .find(j.ImportDeclaration, { source: { value: 'csvtojson' } })
    .forEach((p) => {
      p.replace(
        j.importDeclaration(
          namedSpecs.map((n) => j.importSpecifier(j.identifier(n))),
          j.literal('jtcsv'),
        ),
      );
    });

  root
    .find(j.VariableDeclarator, {
      init: { callee: { name: 'require' }, arguments: [{ value: 'csvtojson' }] },
    })
    .forEach((p) => {
      p.replace(
        j.variableDeclarator(
          j.objectPattern(
            namedSpecs.map((n) =>
              j.property.from({
                kind: 'init', shorthand: true,
                key: j.identifier(n),
                value: j.identifier(n),
              }),
            ),
          ),
          j.callExpression(j.identifier('require'), [j.literal('jtcsv')]),
        ),
      );
    });

  return root.toSource({ quote: 'single', reuseWhitespace: true });
};

module.exports.parser = 'tsx';
