# @jtcsv/trpc

tRPC helper for JTCSV.

## Install
```bash
npm install @jtcsv/trpc jtcsv
```

## Usage
```typescript
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { createCsvProcedure } from 'jtcsv/trpc';

const t = initTRPC.create();

export const router = t.router({
  parseCsv: createCsvProcedure(t, z.string(), { delimiter: ',' })
    .mutation(async ({ input }) => ({ parsed: input }))
});
```
