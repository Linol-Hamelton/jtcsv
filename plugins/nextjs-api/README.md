# @jtcsv/nextjs
Current version: 3.1.0


Next.js helpers for JTCSV: API route handler, React hooks, and browser helpers.

## Install
```bash
npm install @jtcsv/nextjs jtcsv
```

## API route
```javascript
// pages/api/convert.js
import handler from '@jtcsv/nextjs/route';

export default handler;
```

Query options handled by the route:
- format: json|csv
- delimiter
- includeHeaders
- parseNumbers
- parseBooleans
- useFastPath
- preventCsvInjection

## React hook
```jsx
'use client';
import { useJtcsv } from '@jtcsv/nextjs';

export default function Converter() {
  const { convertCsvToJson, convertJsonToCsv, isLoading, error, result } = useJtcsv();
  return null;
}
```

## Components and utilities
```javascript
import {
  CsvFileUploader,
  downloadCsv,
  createJtcsvApiClient,
  JtcsvProvider,
  useJtcsvContext
} from '@jtcsv/nextjs';
```

## Route helpers
```javascript
import {
  csvToJsonHandler,
  jsonToCsvHandler,
  healthCheckHandler,
  createJtcsvApiEndpoint
} from '@jtcsv/nextjs/route';
```
