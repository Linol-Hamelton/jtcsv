# jtcsv-react

[![npm](https://img.shields.io/npm/v/jtcsv-react.svg)](https://www.npmjs.com/package/jtcsv-react)
[![license](https://img.shields.io/npm/l/jtcsv-react.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/jtcsv-react.svg)](https://nodejs.org)

> React hooks and components for [`jtcsv`](https://www.npmjs.com/package/jtcsv).
> `useCsvUpload`, `useCsvParse`, `useCsvDownload`, and `<CsvDropZone>` over
> the SSR-safe `jtcsv/browser` surface.

---

## Install

```bash
npm install jtcsv-react jtcsv react react-dom
```

`jtcsv-react` declares **peer dependencies** for `jtcsv`, `react`, and
`react-dom`. Your application must install them — they are not bundled.

| Peer        | Range              |
| ----------- | ------------------ |
| `jtcsv`     | `^3.2.0 \|\| ^4.0.0` |
| `react`     | `^18 \|\| ^19`       |
| `react-dom` | `^18 \|\| ^19` (optional) |

---

## Quick start

```tsx
import { CsvDropZone } from 'jtcsv-react';

function App() {
  return (
    <CsvDropZone
      accept=".csv,text/csv"
      onParsed={(rows) => console.log('parsed', rows)}
      onError={(err) => console.error(err)}
    />
  );
}
```

That's it — drag a `.csv` file onto the zone, and `onParsed` fires with
the parsed rows.

---

## API

### `useCsvUpload(options?)`

Drag-and-drop / file-input wrapper around `parseCsvFile`. Returns a bag of
state plus a `dropzoneProps` object you can spread onto any element.

#### Options

| Key            | Type                       | Description                                  |
| -------------- | -------------------------- | -------------------------------------------- |
| `parseOptions` | `CsvToJsonOptions`         | Forwarded to `parseCsvFile`.                 |
| `onParsed`     | `(rows: any[]) => void`    | Fires with the merged rows from all files.   |
| `onError`      | `(err: Error) => void`     | Fires once with the first thrown error.      |

#### Returns

| Key             | Type                                                          | Description                                                                 |
| --------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `handleFiles`   | `(files: FileList \| File[]) => Promise<any[]>`               | Parse one or more files and return merged rows. Also fires `onParsed`.      |
| `isParsing`     | `boolean`                                                     | `true` while any `parseCsvFile` is in-flight.                               |
| `error`         | `Error \| null`                                               | Last error from a parse.                                                    |
| `isDragging`    | `boolean`                                                     | `true` between `dragenter` and `drop`/`dragleave`.                          |
| `dropzoneProps` | `{ onDragOver, onDragEnter, onDragLeave, onDrop }`            | Spread these onto your drop target.                                         |

```tsx
import { useCsvUpload } from 'jtcsv-react';

function Upload() {
  const { dropzoneProps, isDragging, isParsing } = useCsvUpload({
    onParsed: (rows) => console.log(rows.length),
  });
  return (
    <div {...dropzoneProps} className={isDragging ? 'over' : ''}>
      {isParsing ? 'Parsing…' : 'Drop CSV'}
    </div>
  );
}
```

### `useCsvParse(text, options?)`

Synchronously parses an in-memory CSV string via `csvToJson`. SSR-safe:
returns `{ data: null }` when `text` is `null` or `undefined`.

```tsx
const { data, error } = useCsvParse(csvString);
```

| Returns     | Type                | Description                                  |
| ----------- | ------------------- | -------------------------------------------- |
| `data`      | `any[] \| null`     | Parsed rows, or `null` when there's no input. |
| `error`     | `Error \| null`     | Parse error, if any.                         |
| `isParsing` | `boolean`           | Always `false` (sync parse).                 |

### `useCsvDownload()`

Returns a `downloadCsv(data, filename?, options?)` function that wraps
`downloadAsCsv` from `jtcsv/browser`. Requires a real browser DOM.

```tsx
const { downloadCsv } = useCsvDownload();
// ...
<button onClick={() => downloadCsv(rows, 'export.csv')}>Download</button>
```

### `<CsvDropZone />`

A drop-in component built on `useCsvUpload`. Click to open the file picker,
or drag a file onto it.

| Prop          | Type                      | Default          |
| ------------- | ------------------------- | ---------------- |
| `accept`      | `string`                  | `.csv,text/csv`  |
| `multiple`    | `boolean`                 | `false`          |
| `parseOptions`| `CsvToJsonOptions`        | —                |
| `onParsed`    | `(rows: any[]) => void`   | —                |
| `onError`     | `(err: Error) => void`    | —                |
| `className`   | `string`                  | —                |
| `children`    | `ReactNode`               | default label    |

If you pass `children`, they replace the default "Drop CSV here" label;
spread your own visuals freely.

---

## Recipe: drop-in CSV upload to React Hook Form

```tsx
import { useForm } from 'react-hook-form';
import { useCsvUpload } from 'jtcsv-react';

type FormShape = { rows: any[] };

function CsvForm() {
  const { register, setValue, handleSubmit } = useForm<FormShape>({
    defaultValues: { rows: [] },
  });

  const { dropzoneProps, isDragging, isParsing } = useCsvUpload({
    onParsed: (rows) => {
      // Hand the parsed rows straight into RHF.
      setValue('rows', rows, { shouldDirty: true, shouldValidate: true });
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => console.log(v))}>
      <div
        {...dropzoneProps}
        style={{
          padding: 32,
          border: '2px dashed #888',
          background: isDragging ? '#eef' : '#fff',
        }}
      >
        {isParsing ? 'Parsing…' : 'Drop a CSV to populate rows'}
      </div>
      <input type="hidden" {...register('rows')} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Errors

`jtcsv-react` re-exports the error classes from `jtcsv/browser`:

```ts
import {
  ValidationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
  ERROR_CODES,
} from 'jtcsv-react';
```

See the upstream [errors guide](https://github.com/Linol-Hamelton/jtcsv/blob/main/docs/errors.md) for the canonical reference.

---

## Compatibility

- Node.js `>=18.17`
- React `^18 || ^19`
- No build step required by consumers — `jtcsv-react` ships authored
  CommonJS in `src/` along with hand-written `.d.ts` types.

---

## License

MIT © Ruslan Fomenko
