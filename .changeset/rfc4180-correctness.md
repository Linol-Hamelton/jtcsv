---
"jtcsv": major
---

Repairs RFC 4180 handling across the parser, the serialiser and the streams.

A control harness that drives the installed package found four correctness
defects the unit suite did not, all one family: records were split on newlines
before quoting was understood, and two repair layers hid the damage by
deleting the data that broke them.

- **A round trip deleted characters.** `normalizeQuotesInField` collapsed every
  doubled quote and removed any quote adjacent to a newline, so `a "q"` followed
  by a newline came back as `a "q` with the closing quote gone.
- **Valid input threw.** A field holding both an escaped quote and a newline
  raised `Unclosed quotes`, though each on its own parsed fine.
- **Streaming lost records at chunk boundaries.** A quoted newline straddling a
  chunk was cut in half and neither half parsed.
- **The fast path shifted columns.** It infers a newline inside a field from
  quote parity per line, which a doubled quote breaks, so a value holding both
  split one record into several and displaced every column after it.

**Behaviour changes**

- `repairRowShifts` and `normalizeQuotes` now default to `false`. They existed
  to compensate for the broken split; with it fixed they only corrupt correct
  data. Still available for genuinely malformed input.
- A quoted empty field reads as `null`, matching a bare empty field and the
  browser parser. It previously returned an empty string in Node only.
- An unterminated quoted field raises `ParsingError` instead of guessing. Input
  such as `"test""` — an open quote, an escaped quote, no close — used to
  return `test"`.
- Malformed bare inner quotes (`"He said "Hi""`) are recovered by closing the
  field at the first unescaped quote rather than reconstructed by the
  normaliser, so the inner quotes are not preserved. Double them to keep them.

The harness lives in `qa/` and runs against a packed tarball, so this class of
defect cannot return unnoticed.
