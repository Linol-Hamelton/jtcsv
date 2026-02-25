# Next.js App Router integration
Current version: 3.1.0

## Problem
Parse CSV uploads in a Next.js app and return JSON for UI rendering.

## API route (App Router)
```ts
import { NextResponse } from 'next/server';
import { csvToJson } from 'jtcsv';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'File missing' }, { status: 400 });
  }

  const text = await file.text();
  const rows = csvToJson(text, {
    delimiter: ',',
    hasHeaders: true,
    parseNumbers: true
  });

  return NextResponse.json({ rows });
}
```

## Client component example
```tsx
'use client';

import { useState } from 'react';

export default function CsvUploader() {
  const [rows, setRows] = useState<any[]>([]);

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/csv', { method: 'POST', body: formData });
    const data = await res.json();
    setRows(data.rows || []);
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={onUpload} />
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}
```

## Server component example
```tsx
import { csvToJson } from 'jtcsv';
import fs from 'fs/promises';

export default async function ServerCsvPreview() {
  const csv = await fs.readFile('./data/sample.csv', 'utf8');
  const rows = csvToJson(csv, { delimiter: ',', hasHeaders: true });
  return <pre>{JSON.stringify(rows, null, 2)}</pre>;
}
```

## File validation
- Validate file extension before parsing.
- Limit max size to protect memory.

## Database integration
- Parse CSV on the server, then insert rows using your ORM.

## Testing
```bash
curl -F "file=@./data.csv" http://localhost:3000/api/csv
```
