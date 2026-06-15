# jtcsv-vue

## 0.1.0 (2026-06-15)

### Initial release

Vue 3 plugin, composables, and `v-csv-upload` directive for the [jtcsv](https://www.npmjs.com/package/jtcsv) CSV/JSON toolkit. Imports from `jtcsv/browser`, so File / Blob / FileReader APIs work in browser Vue apps without extra wiring.

```bash
npm install jtcsv-vue jtcsv vue
```

### Public API

- `createJtcsvPlugin(options?: VuePluginOptions): Plugin` — registers the `v-csv-upload` directive, provides a `JtcsvVueInstance` via the `jtcsvKey` injection key, and installs the `$jtcsv` global property for the Options API.
- `useJtcsv(): JtcsvVueInstance` — Composition-API access to `csvToJson` / `jsonToCsv` (and async variants when enabled). Throws a helpful error if the plugin isn't installed.
- `useJtcsvAsync()` — variant that guarantees the async APIs, falling back to `Promise.resolve(sync(...))` when `async: false`.
- `useCsvUpload({ parseOptions?, onParsed?, onError? })` — wraps `parseCsvFile` from `jtcsv/browser`; returns reactive `isParsing`, `error`, `isDragging` refs plus `handleFiles` / drag-drop handlers.
- `useCsvDownload()` — returns `{ downloadCsv(data, filename?, options?) }` wrapping `downloadAsCsv`.
- `v-csv-upload` directive — `{ onLoad, onError, options }` binding payload for `<input type="file">` elements.
- `jtcsvKey: InjectionKey<JtcsvVueInstance>` — `Symbol.for('jtcsv')` for explicit `inject(jtcsvKey)` calls.
- Re-exports of `ValidationError`, `ParsingError`, `SecurityError`, `FileSystemError`, `LimitError`, `ConfigurationError`, and `ERROR_CODES` from `jtcsv/browser` for convenient `instanceof` checks.

### Notes

- This package supersedes the prototype under `examples/frameworks/vue/`, which imported from the Node-only `jtcsv` entry. The package now imports from `jtcsv/browser` so `parseCsvFile`, `downloadAsCsv`, and the rest of the browser-specific helpers are available.
- Peer dependencies: `vue ^3.3.0`, `jtcsv ^3.2.0 || ^4.0.0`.
