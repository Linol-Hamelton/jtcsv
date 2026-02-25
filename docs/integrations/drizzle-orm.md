# Drizzle ORM integration
Current version: 3.1.0

## Problem
Import CSV into a SQL database using Drizzle ORM.

## Complete working example
```ts
import fs from 'fs/promises';
import { csvToJson } from 'jtcsv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function importCsv(path: string) {
  const csv = await fs.readFile(path, 'utf8');
  const rows = csvToJson(csv, { delimiter: ',', parseNumbers: true });

  await db.insert(users).values(rows as any[]);
}

importCsv('./users.csv').catch(console.error);
```

## Common pitfalls
- Ensure the CSV headers match the table column names.
- Validate data types before inserting.

## Testing
- Run the import with a small CSV first.
- Verify row counts in the database.
