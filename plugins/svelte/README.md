# @jtcsv/svelte

Current version: 1.0.0

Svelte utilities for jtcsv - high-performance CSV/JSON conversion library for Svelte applications.

## Install

```bash
npm install @jtcsv/svelte svelte jtcsv
```

## Quick Start

### Using Stores

```svelte
<script>
  import { createCsvStore } from '@jtcsv/svelte';

  const store = createCsvStore('name,age\nJohn,30\nJane,25');
  
  // Subscribe to data
  $: console.log($store.data);
</script>

<textarea 
  value={$store.csv} 
  on:input={(e) => store.updateFromCsv(e.target.value)} 
/>
```

### Using csvUpload Action

```svelte
<script>
  import { csvUpload } from '@jtcsv/svelte';

  function handleLoad(data, file) {
    console.log('Loaded:', data);
  }
</script>

<input 
  type="file" 
  use:csvUpload={{ onLoad: handleLoad }} 
  accept=".csv" 
/>
```

### Using downloadCsv

```svelte
<script>
  import { downloadCsv } from '@jtcsv/svelte';

  const data = [
    { name: 'Product A', price: 29.99 },
    { name: 'Product B', price: 49.99 }
  ];
</script>

<button on:click={() => downloadCsv(data, 'products.csv')}>
  Download CSV
</button>
```

## API

### createCsvStore(initialCsv, options)

Creates a reactive CSV store with:
- `csv` - Writable store with CSV string
- `data` - Writable store with JSON array
- `error` - Writable store with error messages
- `updateFromCsv(csv)` - Update from CSV string
- `updateFromJson(json)` - Update from JSON array

### csvUpload(node, options)

Svelte action for file upload:
- `onLoad` - Callback when CSV is loaded
- `onError` - Callback on error
- `parseOptions` - CSV parsing options

### downloadCsv(json, filename, options)

Download JSON array as CSV file.

### csvToJsonStore(store, options)

Derived store that converts CSV to JSON.

### jsonToCsvStore(store, options)

Derived store that converts JSON to CSV.

## Example

See [example.ts](example.ts) for complete example.
