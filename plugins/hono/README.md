# @jtcsv/hono

Minimal helpers for Hono routes.

## Install
```bash
npm install @jtcsv/hono jtcsv
```

## Usage
```javascript
import { Hono } from 'hono';
import { csvMiddleware, createCsvResponse } from '@jtcsv/hono';

const app = new Hono();

app.use('/upload', csvMiddleware());
app.post('/upload', (c) => c.json({ rows: c.get('csv') }));

app.get('/export', (c) => {
  const { csv, headers } = createCsvResponse([{ id: 1 }], 'export.csv');
  return c.text(csv, 200, headers);
});
```

## Exports
- csvMiddleware
- createCsvResponse
