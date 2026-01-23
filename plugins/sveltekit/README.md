# @jtcsv/sveltekit

SvelteKit helpers for JTCSV.

## Install
```bash
npm install @jtcsv/sveltekit jtcsv
```

## Usage
```typescript
import { parseCsv, generateCsv } from 'jtcsv/sveltekit';

export const actions = {
  upload: async ({ request }) => {
    const rows = await parseCsv(request, { delimiter: ',' });
    return { success: true, rows };
  }
};

export async function GET() {
  return generateCsv([{ id: 1, name: 'John' }], 'export.csv');
}
```

## Notes
- `parseCsv` reads `request.text()` by default.
- Use `{ formData: true, fieldName: 'file' }` for multipart uploads.
