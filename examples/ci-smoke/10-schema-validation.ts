// 10-schema-validation.ts — Zod schema hook applied via csvToJson hooks.perRow
import { strict as assert } from 'node:assert';
import { z } from 'zod';
import { createZodValidationHook } from 'jtcsv';
import { csvToJson } from 'jtcsv/csv';

(async () => {
  const Row = z.object({
    id: z.coerce.number().int(),
    name: z.string().min(1),
  });

  const hook = createZodValidationHook(Row as any);

  const csv = 'id,name\n1,Ada\n2,Grace';
  const rows = csvToJson(csv, { hooks: { perRow: hook } });

  assert.equal(rows.length, 2);
  assert.deepStrictEqual(rows[0], { id: 1, name: 'Ada' });
  assert.deepStrictEqual(rows[1], { id: 2, name: 'Grace' });

  console.log('ok');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
