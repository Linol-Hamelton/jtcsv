# @jtcsv/remix

Remix helpers for JTCSV.

## Install
```bash
npm install @jtcsv/remix jtcsv
```

## Usage
```typescript
import { parseFormData, generateCsvResponse } from 'jtcsv/remix';

export async function action({ request }) {
  const rows = await parseFormData(request, { delimiter: ',' });
  return { parsed: rows };
}

export async function loader() {
  return generateCsvResponse([{ id: 1, name: 'John' }], 'export.csv');
}
```

## Notes
- `parseFormData` looks for a file field named `file` by default.
- You can override the field name with `{ fieldName: 'upload' }`.
