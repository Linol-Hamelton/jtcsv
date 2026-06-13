# jtcsv-excel

> Excel <-> JSON / CSV adapter for [jtcsv](https://www.npmjs.com/package/jtcsv). Powered by [exceljs](https://www.npmjs.com/package/exceljs).

[![npm version](https://img.shields.io/npm/v/jtcsv-excel.svg)](https://www.npmjs.com/package/jtcsv-excel)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![peer](https://img.shields.io/badge/peer-jtcsv%20%5E3.2.0%20%7C%7C%20%5E4.0.0-orange.svg)](https://www.npmjs.com/package/jtcsv)
[![provenance](https://img.shields.io/badge/provenance-signed-success.svg)](https://docs.npmjs.com/generating-provenance-statements)

## Why

jtcsv ships JSON <-> CSV in the core. xlsx is heavy and binary, so it lives in a separate package. `jtcsv-excel` wires `exceljs` to the jtcsv pipeline so callers can round-trip Excel without leaving the jtcsv mental model.

## Install

```bash
npm install jtcsv-excel jtcsv exceljs
```

Note: `jtcsv` and `exceljs` are peer dependencies — they MUST be installed by the host application. This keeps the published tarball small.

## Quick start

```ts
import { JtcsvExcel } from 'jtcsv-excel';

// Excel -> JSON
const rows = await JtcsvExcel.fromExcel('./data.xlsx');

// JSON -> Excel
await JtcsvExcel.toExcel(rows, './out.xlsx');

// Excel -> CSV (via jtcsv)
const csv = await JtcsvExcel.excelToCsv('./data.xlsx');
```

## API

### `JtcsvExcel.fromExcel(input, options?)`

```ts
static fromExcel(input: string | Buffer, options?: ExcelToJsonOptions): Promise<any[]>
```

Reads an Excel workbook from a file path or `Buffer` and returns the rows of the selected sheet as an array of objects. Header detection, sheet selection, and per-column value transforms are configurable via `options`.

```ts
import { JtcsvExcel } from 'jtcsv-excel';

const rows = await JtcsvExcel.fromExcel('./report.xlsx', {
  sheetName: 'Q2',
  hasHeaders: true,
});
console.log(rows[0]);
```

### `JtcsvExcel.toExcel(data, output?, options?)`

```ts
static toExcel(
  data: any[],
  output?: string | null,
  options?: JsonToExcelOptions,
): Promise<string | Buffer>
```

Writes an array of objects to an `.xlsx` file (default `output.xlsx`) or returns a `Buffer` when `output === null` or `options.returnBuffer === true`. Applies a default header style, auto column widths, and a frozen header row unless overridden.

```ts
const rows = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Linus' }];
const buf = await JtcsvExcel.toExcel(rows, null, { returnBuffer: true });
```

### `JtcsvExcel.excelToCsv(input, options?)`

```ts
static excelToCsv(input: string | Buffer, options?: ExcelToJsonOptions): Promise<string>
```

Reads an Excel file and pipes the resulting rows through `jtcsv.jsonToCsv` to return a CSV string. Pass jtcsv CSV settings via `options.csvOptions`.

```ts
const csv = await JtcsvExcel.excelToCsv('./data.xlsx', {
  csvOptions: { delimiter: ';' },
});
```

### `JtcsvExcel.csvToExcel(csv, output?, options?)`

```ts
static csvToExcel(
  csv: string,
  output?: string | null,
  options?: { csvOptions?: any; excelOptions?: JsonToExcelOptions },
): Promise<string | Buffer>
```

Parses a CSV string with `jtcsv.csvToJson` and writes it to an Excel file (or `Buffer`). CSV parsing options live under `options.csvOptions`; Excel output options under `options.excelOptions`.

```ts
const csv = 'id,name\n1,Ada\n2,Linus\n';
await JtcsvExcel.csvToExcel(csv, './out.xlsx', {
  excelOptions: { sheetName: 'People', autoWidth: true },
});
```

### `JtcsvExcel.readMultipleSheets(input, options?)`

```ts
static readMultipleSheets(
  input: string | Buffer,
  options?: ExcelToJsonOptions,
): Promise<MultiSheetResult>
```

Iterates every worksheet in the workbook and returns a map keyed by sheet name. Each entry includes `id`, `name`, `data`, `rowCount`, and `columnCount`.

```ts
const sheets = await JtcsvExcel.readMultipleSheets('./book.xlsx');
for (const [name, sheet] of Object.entries(sheets)) {
  console.log(name, sheet.rowCount);
}
```

### `JtcsvExcel.createMultiSheetExcel(sheetsData, output?, options?)`

```ts
static createMultiSheetExcel(
  sheetsData: Record<string, any[]>,
  output?: string | null,
  options?: { returnBuffer?: boolean },
): Promise<string | Buffer>
```

Writes a workbook with one sheet per key in `sheetsData`. Each value must be an array of row objects; headers are taken from the first row's keys.

```ts
await JtcsvExcel.createMultiSheetExcel(
  {
    Users: [{ id: 1, name: 'Ada' }],
    Orders: [{ id: 'A1', total: 9.99 }],
  },
  './book.xlsx',
);
```

### `JtcsvExcel.fromExcelAsync(input, options?)`

```ts
static fromExcelAsync(input: string | Buffer, options?: ExcelToJsonOptions): Promise<any[]>
```

Alias of `fromExcel` introduced in 2.1.0 for callers that want to opt in to a worker-pool fast path on large inputs (Buffers larger than ~10 MB). For everything else it delegates to `fromExcel`.

```ts
const fs = require('fs');
const big = fs.readFileSync('./huge.xlsx');
const rows = await JtcsvExcel.fromExcelAsync(big);
```

### `JtcsvExcel.toExcelAsync(data, output?, options?)`

```ts
static toExcelAsync(
  data: any[],
  output?: string | null,
  options?: JsonToExcelOptions,
): Promise<string | Buffer>
```

Alias of `toExcel` introduced in 2.1.0; routes datasets larger than ~10 000 rows through a worker pool. Smaller arrays fall back to the synchronous code path.

```ts
await JtcsvExcel.toExcelAsync(bigRows, './out.xlsx');
```

### `interface ExcelToJsonOptions`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `sheetNumber` | `number` | `1` | 1-based index when `sheetName` is not set. |
| `sheetName` | `string \| null` | `null` | Pick a specific sheet by name. |
| `hasHeaders` | `boolean` | `true` | When false, columns become `column_1`, `column_2`, ... |
| `headerRow` | `number` | `1` | 1-based row holding the headers. |
| `dataStartRow` | `number` | `2` | 1-based row where data begins. |
| `includeEmptyRows` | `boolean` | `false` | Keep all-empty rows in the output. |
| `columnMapping` | `Record<string, string>` | `undefined` | Rename headers as they are read. |
| `valueTransformers` | `Record<string, (v, row, col) => any>` | `{}` | Per-header value rewriter. |
| `csvOptions` | `any` | `undefined` | Forwarded to `jtcsv.jsonToCsv` (used by `excelToCsv`). |

### `interface JsonToExcelOptions`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `sheetName` | `string` | `'Sheet1'` | Sheet name to create. |
| `includeHeaders` | `boolean` | `true` | Emit a header row. |
| `headers` | `string[] \| null` | `null` | Explicit header order; inferred from first row when null. |
| `columnStyles` | `Record<string, any>` | `{}` | Per-header exceljs cell style. |
| `headerStyle` | `any` | bold white on blue | exceljs style applied to header cells. |
| `autoWidth` | `boolean` | `true` | Size columns to content. |
| `freezeHeader` | `boolean` | `true` | Freeze the first row. |
| `returnBuffer` | `boolean` | `false` | Return a `Buffer` instead of writing to disk. |
| `excelOptions` | `any` | `undefined` | Reserved passthrough. |

### `interface MultiSheetResult`

```ts
interface MultiSheetResult {
  [sheetName: string]: {
    id: number;
    name: string;
    data: any[];
    rowCount: number;
    columnCount: number;
  };
}
```

### `interface FormattingRules`

```ts
interface FormattingRules {
  [columnName: string]: {
    style?: any;
    format?: string;
    width?: number;
    alignment?: any;
  };
}
```

## Errors

Throws `JtcsvError` subclasses on failure. Catch `ValidationError` for bad input (empty arrays, malformed options) and `FileSystemError` for unreadable files. See [`jtcsv/errors`](https://github.com/Linol-Hamelton/jtcsv/blob/main/docs/api/errors.md) for the full catalog.

## Compatibility

- Node.js >= 18.17
- jtcsv ^3.2.0 || ^4.0.0
- exceljs ^4.4.0

## Migration from `@jtcsv/excel`

If you had `@jtcsv/excel` installed (it was always private — there should be no real installs in the wild), simply:

```bash
npm uninstall @jtcsv/excel
npm install jtcsv-excel
```

No code changes required — same class name, same statics.

## License

MIT. See [LICENSE](./LICENSE).
