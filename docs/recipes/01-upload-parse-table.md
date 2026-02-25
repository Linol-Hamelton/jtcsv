# Recipe 01: Upload CSV, parse, and render a table
Current version: 3.1.0

## Goal
Let a user upload a CSV file in the browser, parse it, and render a simple HTML table.

## When to use
- You need a quick in-browser preview.
- You want to avoid server-side parsing.

## Example (browser)
```html
<input type="file" id="csv-input" accept=".csv" />
<table id="preview"></table>

<script type="module">
  import { parseCsvFile } from 'jtcsv/browser';

  const input = document.getElementById('csv-input');
  const table = document.getElementById('preview');

  const renderTable = (rows) => {
    if (!rows.length) {
      table.innerHTML = '';
      return;
    }
    const headers = Object.keys(rows[0]);
    const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
    const tbody = rows.map(row => {
      return `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`;
    }).join('');
    table.innerHTML = `${thead}<tbody>${tbody}</tbody>`;
  };

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    const rows = await parseCsvFile(file, {
      delimiter: ',',
      hasHeaders: true,
      parseNumbers: true,
      parseBooleans: true
    });

    renderTable(rows);
  });
</script>
```

## Notes
- If headers are missing, set `hasHeaders: false` and JTCSV will generate `column1`, `column2`, etc.
- For huge files, consider streaming via `parseCsvFileStream` and render incrementally.

## Navigation
- Next: [CSV validation and error detection](02-csv-validation-errors.md)
