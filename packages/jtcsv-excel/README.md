# @jtcsv/excel

Excel integration for JTCSV using `exceljs`.

## Install
```bash
npm install @jtcsv/excel exceljs jtcsv
```

## Quick start
```javascript
const { toExcel, fromExcel, excelToCsv, csvToExcel } = require('@jtcsv/excel');

const data = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 }
];

await toExcel(data, 'employees.xlsx');
const json = await fromExcel('employees.xlsx');
const csv = await excelToCsv('employees.xlsx');
await csvToExcel(csv, 'converted.xlsx');
```

## API
- fromExcel(input, options)
- toExcel(data, output, options)
- excelToCsv(input, options)
- csvToExcel(csv, output, options)
- readMultipleSheets(input)
- createMultiSheetExcel(sheetsData, output)
- exportWithFormatting(data, formatting, output)
- getExcelMetadata(input)
- createTemplate(headers, options)
- jtcsvPlugin (plugin for `jtcsv/plugins`)

## Plugin usage
```javascript
const { create } = require('jtcsv/plugins');
const { jtcsvPlugin } = require('@jtcsv/excel');

const jtcsv = create();
jtcsv.use('excel', jtcsvPlugin());

const base64 = await jtcsv.jsonToCsv(data, { format: 'excel' });
```

## Scripts
```bash
npm test
npm run test:coverage
npm run example
```
