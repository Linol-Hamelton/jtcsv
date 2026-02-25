# Recipe 09: Database import/export with Prisma
Current version: 3.1.0

## Goal
Convert a CSV file into database rows using Prisma.

## Example (Node.js)
```js
const { csvToJson } = require('jtcsv');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importCsv(path) {
  const csv = fs.readFileSync(path, 'utf8');
  const rows = csvToJson(csv, { delimiter: ',', parseNumbers: true });

  await prisma.$transaction(async (tx) => {
    await tx.user.createMany({ data: rows, skipDuplicates: true });
  });
}

importCsv('users.csv')
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Notes
- Validate the CSV schema before import if data quality is unknown.
- Use `skipDuplicates` or a unique constraint for idempotency.

## Navigation
- Previous: [React Hook Form integration](08-react-hook-form.md)
- Next: [CLI automation and batch processing](10-cli-automation.md)
