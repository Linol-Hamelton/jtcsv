# Recipe 08: React Hook Form integration
Current version: 3.1.0

## Goal
Import CSV data into a React Hook Form workflow.

## Example (React)
```jsx
import { useForm } from 'react-hook-form';
import { parseCsvFile } from 'jtcsv/browser';

export function CsvUploader() {
  const { register, setValue, watch } = useForm({ defaultValues: { rows: [] } });
  const rows = watch('rows');

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const parsed = await parseCsvFile(file, {
      delimiter: ',',
      hasHeaders: true,
      parseNumbers: true
    });

    setValue('rows', parsed, { shouldValidate: true });
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={onFile} />
      <pre>{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}
```

## Notes
- Use `setValue` to store the parsed rows.
- For large files, parse on the server or with streaming.

## Navigation
- Previous: [Special characters and encoding](07-special-characters-encoding.md)
- Next: [Database import/export with Prisma](09-database-import-prisma.md)
