# @jtcsv/hono

Hono middleware for JTCSV.

## Install
```bash
npm install @jtcsv/hono jtcsv
```

## Usage
```typescript
import { Hono } from 'hono';
import { csvMiddleware, createCsvResponse } from 'jtcsv/hono';

const app = new Hono()
  .use('/upload', csvMiddleware({ delimiter: ',' }))
  .post('/upload', (c) => {
    const rows = c.get('csv');
    return c.json({ rows });
  })
  .get('/export', (c) => {
    const { csv, headers } = createCsvResponse([{ id: 1 }], 'export.csv');
    return c.text(csv, 200, headers);
  });
```
