# JTCSV framework integrations

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

## Main package shortcuts
If you already depend on `jtcsv`, the adapters are also exported from the main package:
- jtcsv/express
- jtcsv/fastify
- jtcsv/nextjs
- jtcsv/nextjs/route
- jtcsv/nestjs
- jtcsv/remix
- jtcsv/nuxt
- jtcsv/sveltekit
- jtcsv/hono
- jtcsv/trpc

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

## Remix
```bash
npm install @jtcsv/remix jtcsv
```

## Nuxt
```bash
npm install @jtcsv/nuxt jtcsv
```

## SvelteKit
```bash
npm install @jtcsv/sveltekit jtcsv
```

## Hono
```bash
npm install @jtcsv/hono jtcsv
```

## tRPC
```bash
npm install @jtcsv/trpc jtcsv
```

See each package README in this folder for API details.
