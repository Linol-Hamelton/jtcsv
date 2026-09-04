---
"jtcsv": patch
---

`--no-rfc4180` now selects the dialect when reading, not only when writing

The CLI flag reached `jsonToCsv` but neither of the two `csvToJson` call sites,
so once `rfc4180Compliant` started selecting the tokenizer dialect there was no
way to ask the CLI to read a backslash-escaped file. It is passed on both paths
now; the streaming commands already forwarded the parsed options.

Documentation caught up with the parser at the same time:

- `docs/api/csv.md` gained the `rfc4180Compliant` row, and two defaults there
  were still describing the pre-4.0 behaviour — `repairRowShifts` and
  `normalizeQuotes` have been `false` since 4.0, not `true`.
- That table also listed `preventCsvInjection` as a parser option. The parser
  never reads it; it is a serialiser option. Reading always removes a leading
  `'` from in front of `=`, `+`, `-` or `@`, which is the inverse of what
  `jsonToCsv` writes and is what makes a formula survive a round trip.
- The FAQ's "Is jtcsv RFC 4180 compliant?" answer now says what that means for
  a backslash, and points at the escape hatch.
- `docs/api/streams.md` and the Papa Parse migration table describe the option
  in both directions; `escapeChar` maps to `rfc4180Compliant: false` rather
  than to nothing.
