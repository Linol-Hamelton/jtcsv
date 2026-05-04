# jtcsv-codemod

## 0.1.1

### Patch Changes

- Initial public release. jscodeshift transform that rewrites
  `papaparse` imports and call sites to their `jtcsv` equivalents
  (`csvToJson` / `jsonToCsv`), renames Papa-specific options
  (`header` → `hasHeaders`, `dynamicTyping` → `parseNumbers`), and
  strips options that have no jtcsv counterpart with a
  `// TODO(jtcsv-codemod): …` comment so you can review the dropped
  intent.

  Run via:

  ```bash
  npx jtcsv-codemod papaparse "src/**/*.{js,ts,tsx}"
  ```

  Renamed from the originally proposed `@jtcsv/codemod` because the
  `@jtcsv` npm scope is currently unavailable to this project; the
  unscoped name is the lasting one.
