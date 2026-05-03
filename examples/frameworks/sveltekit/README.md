# @jtcsv/sveltekit
Current version: 3.1.0


Helpers for parsing CSV requests and returning CSV responses in SvelteKit.

## Install
```bash
npm install @jtcsv/sveltekit jtcsv
```

## Usage
```javascript
import { parseCsv, generateCsv } from '@jtcsv/sveltekit';

export const actions = {
  upload: async ({ request }) => {
    const rows = await parseCsv(request, { delimiter: ',' });
    return { rows };
  }
};

export async function GET() {
  return generateCsv([{ id: 1 }], 'export.csv');
}
```

## Exports
- parseCsv
- generateCsv
