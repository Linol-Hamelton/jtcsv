# JTCSV framework integrations
Current version: 3.1.0


This folder contains optional adapters published as separate packages. Each adapter depends on `jtcsv`.

## Available packages
- @jtcsv/express-middleware
- @jtcsv/fastify
- @jtcsv/nextjs
- @jtcsv/nestjs
- @jtcsv/remix
- @jtcsv/nuxt
- @jtcsv/sveltekit
- @jtcsv/hono
- @jtcsv/trpc

## Usage note
Framework adapters are published as separate `@jtcsv/*` packages and are not re-exported from the main `jtcsv` entry points.

## Express
```bash
npm install @jtcsv/express-middleware express jtcsv
```
```javascript
const express = require('express');
const { middleware } = require('@jtcsv/express-middleware');

const app = express();
app.use(express.json());
app.use(express.text({ type: 'text/csv' }));
app.use(middleware());
```

## Fastify
```bash
npm install @jtcsv/fastify fastify fastify-plugin jtcsv
```
```javascript
const fastify = require('fastify')();
await fastify.register(require('@jtcsv/fastify'), { prefix: '/api' });
```

## Next.js
```bash
npm install @jtcsv/nextjs jtcsv
```
```javascript
import handler from '@jtcsv/nextjs/route';
export default handler;
```

## NestJS
```bash
npm install @jtcsv/nestjs jtcsv
```
```javascript
const { createCsvParserInterceptor, createCsvDownloadInterceptor } = require('@jtcsv/nestjs');

// Controller example
@UseInterceptors(createCsvParserInterceptor())
@Post('import')
importCsv(@Body() rows) {
  return { rowsCount: rows.length };
}

@UseInterceptors(createCsvDownloadInterceptor({ filename: 'export.csv' }))
@Get('export')
exportCsv() {
  return [{ id: 1, name: 'Alice' }];
}
```

## Remix
```bash
npm install @jtcsv/remix jtcsv
```
```javascript
const { parseFormData, generateCsvResponse } = require('@jtcsv/remix');

export const action = async ({ request }) => {
  const rows = await parseFormData(request, { fieldName: 'file' });
  return generateCsvResponse(rows, 'export.csv');
};
```

## Nuxt
```bash
npm install @jtcsv/nuxt jtcsv
```
```javascript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@jtcsv/nuxt']
});

// usage
const jtcsv = useJtcsv();
const rows = jtcsv.csvToJson('id,name\\n1,Alice');
```

## SvelteKit
```bash
npm install @jtcsv/sveltekit jtcsv
```
```javascript
const { parseCsv, generateCsv } = require('@jtcsv/sveltekit');

export const POST = async ({ request }) => {
  const rows = await parseCsv(request);
  return generateCsv(rows, 'export.csv');
};
```

## Hono
```bash
npm install @jtcsv/hono jtcsv
```
```javascript
const { Hono } = require('hono');
const { csvMiddleware, createCsvResponse } = require('@jtcsv/hono');

const app = new Hono();
app.post('/import', csvMiddleware(), (c) => c.json({ rows: c.get('csv').length }));
app.get('/export', (c) => {
  const { csv, headers } = createCsvResponse([{ id: 1 }], 'export.csv');
  return new Response(csv, { headers });
});
```

## tRPC
```bash
npm install @jtcsv/trpc jtcsv
```
```javascript
const { initTRPC } = require('@trpc/server');
const { createCsvProcedure } = require('@jtcsv/trpc');
const { z } = require('zod');

const t = initTRPC.create();
const csvInput = z.object({ csv: z.string() });

const parseCsv = createCsvProcedure(t, csvInput);
```

See each package README in this folder for API details.
