# React Hook Form integration
Current version: 3.1.0

## Problem
Import CSV into a form and validate or transform the data before submission.

## Complete working example
```jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { parseCsvFile } from 'jtcsv/browser';

export function CsvUploaderForm() {
  const { register, setValue, handleSubmit, watch } = useForm({
    defaultValues: { rows: [] }
  });
  const rows = watch('rows');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setIsParsing(true);
    setError('');
    try {
      const parsedFiles = await Promise.all(
        files.map((file) =>
          parseCsvFile(file, {
            delimiter: ',',
            hasHeaders: true,
            parseNumbers: true
          })
        )
      );

      const merged = parsedFiles.flat();
      setValue('rows', merged, { shouldValidate: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
    } finally {
      setIsParsing(false);
    }
  };

  const onFileChange = (event) => {
    handleFiles(event.target.files);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const onDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onSubmit = (data) => {
    console.log('submit', data.rows);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: '2px dashed #999',
          padding: 16,
          borderRadius: 8,
          background: isDragging ? '#f6f6f6' : 'transparent'
        }}
      >
        <p>Drop CSV files here or choose files:</p>
        <input type="file" accept=".csv" multiple onChange={onFileChange} />
      </div>

      {isParsing && <p>Parsing...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <input type="hidden" {...register('rows')} />
      <pre>{JSON.stringify(rows, null, 2)}</pre>
      <button type="submit" disabled={isParsing}>Submit</button>
    </form>
  );
}
```


## Common pitfalls
- Large CSV files should be handled in a worker or on the server.
- Use `parseCsvFileStream` if you need lazy processing.

## Testing
- Upload a CSV file with headers.
- Ensure form submission contains parsed rows.
