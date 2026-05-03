# @jtcsv/trpc
Current version: 3.1.0


Middleware helper that parses CSV input for tRPC procedures.

## Install
```bash
npm install @jtcsv/trpc jtcsv
```

## Usage
```javascript
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { createCsvProcedure } from '@jtcsv/trpc';

const t = initTRPC.create();

export const router = t.router({
  parseCsv: createCsvProcedure(t, z.string())
    .mutation(async ({ input }) => ({ rows: input }))
});
```

## Exports
- createCsvProcedure
