---
"jtcsv": minor
---

The browser CSV parser now implements RFC 4180 quoting and matches the Node
parser exactly; a parity suite pins the two together.

**Behaviour changes for `jtcsv/browser` consumers** — values stay strings
unless `parseNumbers: true` is passed (the option was previously ignored and
numbers and booleans were always coerced), `maxRows` raises `LimitError`
instead of truncating silently, and an unclosed quote raises `ParsingError`
instead of returning mangled rows.

See the notes below for the full list, including the stream helpers that
dropped their `options` argument and the release pipeline that had been red
since 12 June.
