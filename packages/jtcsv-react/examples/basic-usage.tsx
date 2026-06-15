/**
 * jtcsv-react — basic usage example.
 *
 * Demonstrates both `useCsvUpload` (custom UI) and `<CsvDropZone>` (default UI).
 * Run inside any React 18/19 app.
 */

import * as React from 'react';
import { CsvDropZone, useCsvUpload, useCsvDownload } from 'jtcsv-react';

export default function BasicUsage() {
  const [rows, setRows] = React.useState<any[]>([]);
  const { downloadCsv } = useCsvDownload();

  const {
    dropzoneProps,
    isDragging,
    isParsing,
    error,
  } = useCsvUpload({
    onParsed: (parsed) => setRows(parsed),
    onError: (err) => console.error('parse failed', err),
  });

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>jtcsv-react demo</h1>

      <section>
        <h2>Custom dropzone via useCsvUpload</h2>
        <div
          {...dropzoneProps}
          style={{
            padding: 32,
            border: '2px dashed #888',
            borderRadius: 8,
            background: isDragging ? '#eef' : '#fff',
            textAlign: 'center',
          }}
        >
          {isParsing
            ? 'Parsing…'
            : isDragging
              ? 'Release to upload'
              : 'Drop a CSV file here'}
        </div>
        {error ? <p style={{ color: 'crimson' }}>{error.message}</p> : null}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Default {'<CsvDropZone />'}</h2>
        <CsvDropZone onParsed={(parsed) => setRows(parsed)} />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>{rows.length} parsed rows</h2>
        <pre style={{ background: '#f6f6f6', padding: 16, maxHeight: 240, overflow: 'auto' }}>
          {JSON.stringify(rows.slice(0, 10), null, 2)}
        </pre>
        <button disabled={!rows.length} onClick={() => downloadCsv(rows, 'export.csv')}>
          Download CSV
        </button>
      </section>
    </div>
  );
}
