---
"jtcsv": major
---

Fixes three defects that broke the first five minutes for every new user.

**The default delimiter is now `,` (was `;`).** CSV means comma-separated
values and every other parser in the ecosystem defaults to a comma;
`jsonToCsv(rows)` was emitting `a;b`, which breaks Excel outside continental
Europe and every standard consumer. Pass `{ delimiter: ';' }` for the old
output. Reading is unaffected — the parser auto-detects.

**`import { csvToJson } from 'jtcsv'` works in ESM.** It threw
`SyntaxError: Named export 'csvToJson' not found` — the exports map pointed
at ESM files named `.js` inside a `"type": "commonjs"` package, so Node
parsed them as CommonJS. ESM bundles are now `.mjs`. This affected every
Node ESM consumer and the README's first example.

**The CLI no longer corrupts comma files.** `jtcsv csv-to-json data.csv`
parsed `id,name,city` into a single column literally named "id,name,city"
and reported success: argument parsing hardcoded `delimiter: ';'`, which
disabled the auto-detection that the option `autoDetect: true` claimed to
enable. Detection now runs for both the buffered and `--stream` paths.
