# @jtcsv/remix
Current version: 3.1.0


Remix helpers for CSV form uploads and CSV responses.

## Install
```bash
npm install @jtcsv/remix jtcsv
```

## Usage
```javascript
import { parseFormData, generateCsvResponse } from '@jtcsv/remix';

export async function action({ request }) {
  const rows = await parseFormData(request, { fieldName: 'file', delimiter: ',' });
  return { rows };
}

export async function loader() {
  return generateCsvResponse([{ id: 1 }], 'export.csv');
}
```

## Exports
- parseFormData
- generateCsvResponse
