---
"jtcsv": minor
---

Make the browser CSV parser agree with the Node parser.

`jtcsv/browser` split rows with `line.split(delimiter)` and had no notion of
quoting, so every RFC 4180 quoting rule silently produced wrong data — a
field containing the delimiter, a newline, or an escaped `""` was torn apart
with no error raised. It also coerced numbers and booleans unconditionally
while ignoring the documented `parseNumbers` option, and truncated input
past `maxRows` instead of raising `LimitError`.

The parser now tokenises properly and matches the Node reference
implementation exactly; a new parity suite pins the two together.

**Behaviour changes for `jtcsv/browser` consumers**

- Values stay strings unless `parseNumbers: true` is passed, matching Node
  and the documented default. Previously numbers and booleans were always
  coerced and `parseNumbers` was ignored entirely.
- Exceeding `maxRows` now throws `LimitError` rather than silently
  returning a truncated result.
- An unclosed quote now throws `ParsingError` rather than returning
  mangled rows.

Also fixed in the browser entry: the stream helpers dropped their `options`
argument, `csvToJsonStream` returned unparsed `{ raw }` fragments for
`ReadableStream` input, `autoDetectDelimiter` was missing from the ESM
build, and `browser.d.ts` declared the wrong arity for all three stream
functions.
