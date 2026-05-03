# @jtcsv/excel

## 2.0.0

### Minor Changes

- 1ef708c: ## jtcsv 3.2.0 — bundle diet, modernization, ecosystem

  ### Highlights

  - **Tarball gzip −49 %** (703 → 359 kB), unpacked −44 % (3.9 MB → 2.2 MB),
    88 vs 192 files. The unpacked TS sources, `examples/`, and source maps
    no longer ship; rollup is the sole producer of `.js` in `dist/`.
  - **Subpath imports** (`jtcsv/csv`, `jtcsv/json`, `jtcsv/streams`, `jtcsv/ndjson`,
    `jtcsv/tsv`, `jtcsv/errors`, plus the existing `jtcsv/browser`, `/plugins`, `/schema`,
    `/cli`). `import { csvToJson } from 'jtcsv/csv'` costs **~18 KB gzipped**.
  - **ES2022 target** + `engines.node: >=18.17.0`. Drops the `@babel/preset-env`
    - 4 babel plugins from devDependencies. Rollup pipeline no longer transpiles.
  - **Worker threads** wired into `csvToJsonAsync` / `jsonToCsvAsync` /
    `streamCsvToJsonAsync` / `streamJsonToCsvAsync` via the new `useWorkers`
    - `workerCount` options. Thresholded (1 MB CSV / 20 K rows) so small
      inputs stay sync. Closes 7 in-tree TODOs.
  - **Runtime deprecation warnings** for `csvToJsonFile`, `csvToJsonFileSync`,
    `csvToJsonStream`, `csvFileToJsonStream` — each emits a one-time
    `DeprecationWarning` (code `JTCSV_DEP_*`) on first call. Removal target: 5.0.
  - **Strict-TS regression gate** at 65 errors (was untracked / 188 unbounded).
    Any future PR that bumps strict-mode errors fails publish.
  - **CI bench badge**: head-to-head vs papaparse / csv-parse / fast-csv on
    every push to main, published to GitHub Pages, with a 25 % regression
    alert. Local results: `jtcsv (fastPath)` is **1.8–4.2× faster** than the
    competition on 100 K and 1 M rows.
  - **`@jtcsv/codemod`**: new sibling package with a jscodeshift transform
    that auto-rewrites `papaparse` imports + calls to jtcsv equivalents.
    Run `npx @jtcsv/codemod papaparse "src/**/*.{js,ts,tsx}"`.
  - **OpenSSF Scorecard** workflow + badge.
  - **Property-based fuzz tests** (fast-check) cover newline-in-cell and
    quote-in-cell round-trips with 80–100 random inputs each.

  ### @jtcsv/\* sub-packages

  All ten sub-packages now ship with:

  - `peerDependencies.jtcsv: "^3.1.0 || ^4.0.0"` (was a mix of `^2.1.0`, `^2.1.3`, `^3.1.0` — none compatible with 3.x simultaneously).
  - `publishConfig: { access: public, provenance: true }` — every release is signed via Sigstore.
  - Updated framework peer ranges: Express ^4 || ^5, Fastify ^4 || ^5, Next.js ^13 || ^14 || ^15, React ^18 || ^19, NestJS ^9 || ^10 || ^11.
  - 7 client-only adapters (vue, angular, svelte, sveltekit, nuxt, remix, trpc) demoted to `examples/frameworks/` since their wrapper value-add is thin.

  ### Migration

  Most users need no changes; the deprecated function names still work and
  just print a one-time warning. To clean up:

  ```bash
  npx @jtcsv/codemod papaparse "src/**/*.{js,ts,tsx}"
  ```

  Or replace the names by hand:

  | Deprecated            | Use instead                 |
  | --------------------- | --------------------------- |
  | `csvToJsonFile`       | `readCsvAsJson`             |
  | `csvToJsonFileSync`   | `readCsvAsJsonSync`         |
  | `csvToJsonStream`     | `createCsvToJsonStream`     |
  | `csvFileToJsonStream` | `createCsvFileToJsonStream` |

  Node 12, 14, 16 are no longer supported. Bump to Node 18.17 or newer.

  ### Honest disclaimers

  - Strict TypeScript still has **65 errors** in the 9 hot files outside the
    excluded experimental modules. They're locked behind the regression
    gate; per-file cleanup is ongoing.
  - Quote-in-cell + delimiter-in-cell combinations still trip the parser's
    state machine on some shrunk fast-check counterexamples; tracked
    separately. Default `normalizeQuotes: true` is intentionally lossy
    (collapses `""` → `"`); pass `normalizeQuotes: false` for strict
    RFC 4180 round-trips.

### Patch Changes

- Updated dependencies [1ef708c]
  - jtcsv@3.2.0
