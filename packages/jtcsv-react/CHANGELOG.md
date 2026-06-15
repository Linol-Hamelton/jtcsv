# jtcsv-react

## 0.1.0 (2026-06-15)

Initial release. Public surface: `useCsvUpload`, `useCsvParse`, `useCsvDownload` hooks; `<CsvDropZone>` component; error class re-exports from `jtcsv/browser`.

### Highlights

- React hooks built on top of `jtcsv/browser` — SSR-safe by construction (no
  module-load-time access to `window`).
- Drag-and-drop file upload via `useCsvUpload`, returning `dropzoneProps`
  ready to spread onto any element.
- Memoized synchronous parse via `useCsvParse(text)`.
- `<CsvDropZone>` ships a sensible default UI but accepts `children` for full
  customization.
- Re-exports `ValidationError`, `ParsingError`, `SecurityError`,
  `FileSystemError`, `LimitError`, `ConfigurationError`, and `ERROR_CODES`
  from `jtcsv/browser` so callers don't need a second import.

### Notes

- Authoritative TypeScript source is `src/index.tsx` (not `.ts`) because the
  component uses JSX. The CommonJS hand-mirror lives in `src/index.js` and
  the hand-written types in `src/index.d.ts`, mirroring the post-W9 layout
  used by `jtcsv-excel`.

### Peer dependencies

- `jtcsv ^3.2.0 || ^4.0.0`
- `react ^18 || ^19`
- `react-dom ^18 || ^19` (optional)
