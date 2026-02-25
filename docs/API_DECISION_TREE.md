# API Decision Tree
Current version: 3.1.0


Use this guide to pick the right CSV -> JSON API depending on where your data lives and how big it is.

## Mermaid decision tree
```mermaid
flowchart TD
  A[I need to convert data] --> B{What format do you have?}
  B -->|CSV| C{Where is the CSV?}
  B -->|JSON| J{How big is it?}
  J -->|Small or medium| J1[jsonToCsv(data, options)]
  J -->|Large or streaming| J2[createJsonToCsvStream(options)]
  C -->|CSV string in memory| C1[csvToJson(csv, options)]
  C -->|Node file path| D{File size?}
  C -->|Browser File or Blob| C2[parseCsvFile / parseCsvFileStream]
  D -->|Small or known| D1[readCsvAsJson(filePath, options)]
  D -->|Large or unknown| D2[createCsvFileToJsonStream(filePath, options)]
```

## Quick Decision

1) Do you already have a CSV string in memory?
- Yes -> `csvToJson(csv, options)`
- No -> go to 2

2) Do you have a file path on Node.js?
- Yes -> go to 3
- No (browser File/Blob) -> use `parseCsvFile(file, options)` or `parseCsvFileStream(file, options)`

3) Is the file small enough to load in memory?
- Yes -> `readCsvAsJsonSync(filePath, options)` / `readCsvAsJson(filePath, options)` (aliases: `csvToJsonFileSync`, `csvToJsonFile`)
- No / unknown -> go to 4

4) Do you want streaming output (row-by-row)?
- Yes -> `createCsvToJsonStream(options)` / `createCsvFileToJsonStream(filePath, options)` (aliases: `csvToJsonStream`, `csvFileToJsonStream`)
- No -> `streamCsvToJson(csv, options)` to keep memory bounded

## Common Scenarios

- Small CSV string -> `csvToJson`
- Large CSV string but you want lazy processing -> `csvToJsonIterator`
- Node.js file path -> `readCsvAsJsonSync` / `readCsvAsJson` (aliases: `csvToJsonFileSync`, `csvToJsonFile`)
- Large file (Node.js) -> `createCsvFileToJsonStream` (alias: `csvFileToJsonStream`)
- Browser File/Blob -> `parseCsvFile` or `parseCsvFileStream`
- Browser + huge CSV -> `parseCSVWithWorker` (Web Worker pool)

## Notes

- `csvToJsonIterator` is lazy over a string, so the CSV is still fully in memory.
- Streaming APIs (`createCsvToJsonStream`, `createCsvFileToJsonStream`, aliases: `csvToJsonStream`, `csvFileToJsonStream`) keep memory usage lower.
- For JSON -> CSV, use `jsonToCsv` (string) or `createJsonToCsvStream` (streaming).
