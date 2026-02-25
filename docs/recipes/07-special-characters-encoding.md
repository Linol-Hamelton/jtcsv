# Recipe 07: Special characters and encoding
Current version: 3.1.0

## Goal
Handle UTF-8 BOM, non-UTF8 input, and special characters safely.

## Example
```js
const { autoDetectAndConvert, csvToJson } = require('jtcsv');

const rawBuffer = require('fs').readFileSync('input.csv');
const { text: utf8Csv } = autoDetectAndConvert(rawBuffer);

const rows = csvToJson(utf8Csv, { delimiter: ',' });
console.log(rows);
```

## Notes
- `autoDetectAndConvert` normalizes encodings to UTF-8.
- JTCSV strips BOM during parsing for most workflows.

## Navigation
- Previous: [Type coercion and custom parsing](06-type-coercion-custom-parsing.md)
- Next: [React Hook Form integration](08-react-hook-form.md)
