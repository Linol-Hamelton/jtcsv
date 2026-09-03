---
"jtcsv": patch
---

Fix the file APIs and worker parsing under ESM

The ESM bundles shipped in 4.0.0 carried CommonJS globals that do not exist in
an ES module, so anything reaching them threw for `import` users while working
normally for `require` users:

- `readCsvAsJson`, `readCsvAsJsonSync`, `saveAsCsv` and the other file helpers
  failed with `File system error: require is not defined`. The optional Node
  built-ins (`worker_threads`, `os`, `glob`) are loaded lazily through
  `require()` so they can be probed where they may be absent, and Rollup emits
  those calls unchanged.
- `csvToJsonAsync(..., { useWorkers: true })` failed with
  `__dirname is not defined`, but only past the parallelism threshold
  (1 MB of CSV or 20 000 rows) — that is, exactly when workers are worth
  turning on. Below it the call stays synchronous and never reaches the
  worker-script resolver.

Node-targeted ESM output now restores `require`, `__dirname` and `__filename`
from `import.meta.url`. The browser bundles are untouched: they use none of
these and must not import a `node:` builtin.

`npm run verify:esm` was added and runs in CI. Jest runs under CommonJS and the
examples run through tsx, so neither suite loaded `dist/*.mjs` at all — which
is why this shipped. The check inspects every built ESM bundle for unshimmed
CJS globals and then exercises both broken paths for real: a file round-trip,
and a parse large enough to actually spawn workers.
