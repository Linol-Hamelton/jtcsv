# JTCSV framework integrations

This folder contains the **published** framework adapters. They live in the
monorepo and are released as separate `@jtcsv/*` packages alongside the
core `jtcsv` package.

## Available packages

| Package           | Framework               | Versions supported              |
|-------------------|-------------------------|---------------------------------|
| `@jtcsv/express`  | [Express](express-middleware/) | ^4.18.0 \|\| ^5.0.0       |
| `@jtcsv/fastify`  | [Fastify](fastify-plugin/)     | ^4.0.0 \|\| ^5.0.0        |
| `@jtcsv/nextjs`   | [Next.js](nextjs-api/)         | ^13 \|\| ^14 \|\| ^15     |
| `@jtcsv/hono`     | [Hono](hono/)                  | ^4.0.0                    |
| `@jtcsv/nestjs`   | [NestJS](nestjs/)              | ^9 \|\| ^10 \|\| ^11      |

Every package peers `jtcsv: ^3.2.0 || ^4.0.0` and is published with npm
provenance attestation.

## Client-side and meta-frameworks → examples

For Vue, Angular, Svelte, SvelteKit, Nuxt, Remix and tRPC, the value-add
of a wrapper package is thin (see
[../examples/frameworks/](../examples/frameworks/) for ready-to-copy
snippets). If you need a published wrapper for any of those, open an
issue with the use case.

## Express

```bash
npm install @jtcsv/express express jtcsv
```

```javascript
const express = require('express');
const { middleware } = require('@jtcsv/express');

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
npm install @jtcsv/nestjs @nestjs/common rxjs jtcsv
```

```typescript
import { createCsvParserInterceptor } from '@jtcsv/nestjs';

@UseInterceptors(createCsvParserInterceptor())
@Post('import')
importCsv(@Body() rows) {
  return { rowsCount: rows.length };
}
```

## Hono

```bash
npm install @jtcsv/hono hono jtcsv
```

```javascript
import { Hono } from 'hono';
import { csvMiddleware, createCsvResponse } from '@jtcsv/hono';

const app = new Hono();
app.post('/import', csvMiddleware(), (c) => c.json({ rows: c.get('csv').length }));
```

See each package's individual README for the full API.
