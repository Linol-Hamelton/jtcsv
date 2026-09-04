---
"jtcsv": major
---

One parsing dialect across every engine

jtcsv reaches the same bytes through five code paths — the synchronous fast
path, the synchronous standard path, `csvToJsonAsync`, the streaming transform
and the browser build — and which one runs is mostly invisible to the caller.
The fast path in particular disables itself as soon as the input contains an
escaped quote, so a file gains or loses an engine because of its content. Those
engines had drifted apart. They now share one tokenizer and one value
normaliser, and a differential suite pins them together.

**Fixed — an apostrophe in ordinary data no longer throws.** `'` was treated as
a quote character alongside `"`, which no CSV dialect does, so `O'Brien` opened
a quoted field that never closed and raised `Unclosed quotes`. The fast path
has its own tokenizer and was unaffected, which hid it — but combine an
apostrophe with an escaped quote anywhere in the file, as in
`O'Brien,"he said ""hi"""`, and the fast path steps aside and default options
throw. This affected `csvToJson`, `csvToJsonAsync` and `createCsvToJsonStream`.

**Fixed — backslashes are no longer deleted.** The Node tokenizer treated a
backslash as an escape character. RFC 4180 defines none, and neither did this
library's own browser build, so `C:\Users\Dmitry` arrived as `C:UsersDmitry` in
Node and intact in the browser: silent data loss, and the two halves of the
library disagreeing about what a CSV is. **This is the breaking change.** The
old behaviour is still available per call with `rfc4180Compliant: false`, for
files written with the MySQL/Postgres convention.

`rfc4180Compliant` was already declared in the option types and documented as
defaulting to true, but the parser never read it — it only ever affected line
endings when writing. It now selects the input dialect as well.

**Fixed — the browser build agrees with Node.** Its field coercion was a
separate implementation that ignored `trim`, never implemented `parseBooleans`
at all, matched a narrower set of numbers (`1e5`, `+5` and `.5` stayed
strings), left the apostrophe that `preventCsvInjection` writes in front of a
formula in place — so `jsonToCsv` -> `csvToJson` round-tripped in Node and
silently did not in the browser — and omitted keys for missing fields where
Node emits them holding `undefined`. Six differences, none of which the
existing parity suite could see, because Jest's `toEqual` ignores `undefined`
properties.

**Fixed — the streaming parser matched neither.** It carried its own copy of
the normaliser with a looser numeric rule, so `Infinity` became a number there
and stayed a string everywhere else, and with `trim: false` so did `"  12"`. It
also still carried the pre-4.0 tokenizer, including the `i + 2 === line.length`
special case that the RFC 4180 repair removed from the batch parser and never
carried across; fuzzing quote patterns across the two found 41 disagreements in
120 inputs.

**Fixed — `warnExtraFields` does something.** It was declared and documented as
the switch for the extra-field warning, but every copy of that code keyed off
`NODE_ENV === 'development'` instead, so the option did nothing in any
environment.

`__tests__/engine-parity.test.ts` now runs every case through all five engines
and compares key order, key presence and values, including `undefined`. It
found two of the divergences above on its first run.

**Known difference, unchanged:** `createCsvToJsonStream` rejects a row whose
field count differs from the header, while `csvToJson` reconciles it against
the header. That asymmetry is recorded in the parity suite rather than altered
here.
